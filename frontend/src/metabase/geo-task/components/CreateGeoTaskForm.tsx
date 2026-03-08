import { useFormikContext } from "formik";
import { useMemo } from "react";
import { t } from "ttag";
import * as Yup from "yup";

import type { CreateGeoTaskRequest } from "metabase/api/geo-task";
import {
  useCreateGeoTaskMutation,
  useGetAiPlatformsQuery,
} from "metabase/api/geo-task";
import FormErrorMessage from "metabase/common/components/FormErrorMessage";
import { FormFooter } from "metabase/common/components/FormFooter";
import {
  Form,
  FormNumberInput,
  FormProvider,
  FormSelect,
  FormSubmitButton,
} from "metabase/forms";
import { FormField } from "metabase/forms/components/FormField";
import { FormTextInput } from "metabase/forms/components/FormTextInput";
import {
  Button,
  Flex,
  Grid,
  Icon,
  Paper,
  Stack,
  TextInput,
  Title,
} from "metabase/ui";

/** AI模式枚举: Search */
const AI_MODE_OPTIONS = [{ value: "Search", label: "Search" }];

/** 任务品牌名枚举: 高洁丝、好奇 */
const BRAND_OPTIONS = [
  { value: "高洁丝", label: "高洁丝" },
  { value: "好奇", label: "好奇" },
];

interface CreateGeoTaskFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormValues {
  task_name: string;
  query_text: string;
  platform_name: string | null;
  ai_mode: string | null;
  product_brand: string | null;
  comparison_brand_names: string[];
  product_keywords: string;
  comparison_product_keywords: string[];
  selling_point_keywords: string[];
  /** User-facing: hours between runs (e.g. 6). Converted to cron on submit. */
  schedule_hours: number | null;
  enabled: boolean;
}

/** Convert hours to cron: e.g. 6 -> every 6 hours at minute 0 */
function hoursToCron(hours: number): string {
  return `0 */${hours} * * *`;
}

/** 竞品：品牌与产品关键词 1:1 成对，每行一个品牌 + 对应产品关键词 */
function ComparisonBrandProductPairs() {
  const { values, setFieldValue } = useFormikContext<FormValues>();
  const brands = values.comparison_brand_names || [""];
  const keywords = values.comparison_product_keywords || [""];
  const length = Math.max(brands.length, keywords.length, 1);
  const brandsPadded = [...brands, ...Array(length - brands.length).fill("")];
  const keywordsPadded = [
    ...keywords,
    ...Array(length - keywords.length).fill(""),
  ];

  const addRow = () => {
    setFieldValue("comparison_brand_names", [...brandsPadded, ""]);
    setFieldValue("comparison_product_keywords", [...keywordsPadded, ""]);
  };

  const updateBrand = (index: number, value: string) => {
    const next = [...brandsPadded];
    next[index] = value;
    setFieldValue("comparison_brand_names", next);
  };

  const updateKeywords = (index: number, value: string) => {
    const next = [...keywordsPadded];
    next[index] = value;
    setFieldValue("comparison_product_keywords", next);
  };

  const removeRow = (index: number) => {
    if (length <= 1) {
      return;
    }
    setFieldValue(
      "comparison_brand_names",
      brandsPadded.filter((_, i) => i !== index),
    );
    setFieldValue(
      "comparison_product_keywords",
      keywordsPadded.filter((_, i) => i !== index),
    );
  };

  return (
    <FormField
      title={t`Comparison Brands & Product Keywords`}
      description={t`One row per competitor: brand name + its product keywords. Click + to add a row.`}
      mb="xs"
    >
      <Stack gap="xs">
        {brandsPadded.map((_, index) => (
          <Flex key={index} align="center" gap="sm" wrap="wrap">
            <TextInput
              value={brandsPadded[index]}
              onChange={(e) => updateBrand(index, e.target.value)}
              placeholder={t`Brand name`}
              style={{ flex: 1, minWidth: 120 }}
            />
            <TextInput
              value={keywordsPadded[index]}
              onChange={(e) => updateKeywords(index, e.target.value)}
              placeholder={t`Product keywords for this brand`}
              style={{ flex: 1, minWidth: 160 }}
            />
            <Button
              type="button"
              variant="filled"
              size="sm"
              onClick={addRow}
              title={t`Add row`}
              aria-label={t`Add row`}
            >
              <Icon name="add" />
            </Button>
            {length > 1 && (
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => removeRow(index)}
                title={t`Remove row`}
                aria-label={t`Remove row`}
              >
                <Icon name="close" />
              </Button>
            )}
          </Flex>
        ))}
      </Stack>
    </FormField>
  );
}

function DynamicStringList({
  name,
  title,
  description,
  placeholder,
}: {
  name: keyof FormValues;
  title: string;
  description?: string;
  placeholder?: string;
}) {
  const { values, setFieldValue } = useFormikContext<FormValues>();
  const list = (values[name] as string[]) || [""];

  const add = () => {
    setFieldValue(name, [...list, ""]);
  };

  const update = (index: number, value: string) => {
    const next = [...list];
    next[index] = value;
    setFieldValue(name, next);
  };

  const remove = (index: number) => {
    if (list.length <= 1) {
      return;
    }
    const next = list.filter((_, i) => i !== index);
    setFieldValue(name, next);
  };

  return (
    <FormField title={title} description={description} mb="xs">
      <Flex direction="column" gap="xs">
        {list.map((item, index) => (
          <Flex key={index} align="center" gap="sm">
            <TextInput
              value={item}
              onChange={(e) => update(index, e.target.value)}
              placeholder={placeholder}
              style={{ flex: 1 }}
            />
            <Button
              type="button"
              variant="filled"
              size="sm"
              onClick={add}
              title={t`Add`}
              aria-label={t`Add`}
            >
              <Icon name="add" />
            </Button>
            {list.length > 1 && (
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => remove(index)}
                title={t`Remove`}
                aria-label={t`Remove`}
              >
                <Icon name="close" />
              </Button>
            )}
          </Flex>
        ))}
      </Flex>
    </FormField>
  );
}

export const CreateGeoTaskForm = ({
  onSuccess,
  onCancel,
}: CreateGeoTaskFormProps) => {
  const [createGeoTask, { isLoading }] = useCreateGeoTaskMutation();

  const geoTaskSchema = useMemo(
    () =>
      Yup.object({
        task_name: Yup.string()
          .required(t`Task name is required`)
          .max(200, t`Task name must be 200 characters or less`),
        query_text: Yup.string()
          .nullable()
          .max(500, t`Task question must be 500 characters or less`),
        platform_name: Yup.string().nullable(),
        ai_mode: Yup.string().nullable(),
        product_brand: Yup.string().nullable(),
        comparison_brand_names: Yup.array().of(Yup.string()),
        product_keywords: Yup.string().nullable(),
        comparison_product_keywords: Yup.array().of(Yup.string()),
        selling_point_keywords: Yup.array().of(Yup.string()),
        schedule_hours: Yup.number()
          .nullable()
          .integer(t`Must be a whole number`)
          .min(1, t`Must be at least 1 hour`)
          .max(24, t`At most 24 hours (once per day)`),
        enabled: Yup.boolean(),
      }),
    [],
  );

  const initialValues: FormValues = useMemo(
    () => ({
      task_name: "",
      query_text: "",
      platform_name: null,
      ai_mode: null,
      product_brand: null,
      comparison_brand_names: [""],
      product_keywords: "",
      comparison_product_keywords: [""],
      selling_point_keywords: [""],
      schedule_hours: null,
      enabled: true,
    }),
    [],
  );

  const handleSubmit = async (values: FormValues) => {
    const brands = values.comparison_brand_names || [];
    const keywords = values.comparison_product_keywords || [];
    const len = Math.max(brands.length, keywords.length);
    const comparison_brands: Record<string, string[]> = {};
    for (let i = 0; i < len; i++) {
      const b = (brands[i] || "").trim();
      const k = (keywords[i] || "").trim();
      if (!b) {
        continue;
      }
      comparison_brands[b] = k
        ? k
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    }

    const body: CreateGeoTaskRequest = {
      task_name: values.task_name,
      query_text: values.query_text || undefined,
      ai_model: values.platform_name ?? undefined,
      ai_mode: values.ai_mode ?? undefined,
      product_brand: values.product_brand ?? undefined,
      product_keywords: values.product_keywords || undefined,
      selling_point_keywords: values.selling_point_keywords.filter(Boolean),
      comparison_brands: Object.keys(comparison_brands).length
        ? comparison_brands
        : undefined,
      schedule_cron:
        values.schedule_hours != null && values.schedule_hours >= 1
          ? hoursToCron(values.schedule_hours)
          : undefined,
    };

    try {
      await createGeoTask(body).unwrap();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create geo task:", error);
    }
  };

  return (
    <FormProvider
      initialValues={initialValues}
      validationSchema={geoTaskSchema}
      onSubmit={handleSubmit}
    >
      <CreateGeoTaskFormInner disabled={isLoading} onCancel={onCancel} />
    </FormProvider>
  );
};

function CreateGeoTaskFormInner({
  disabled,
  onCancel,
}: {
  disabled: boolean;
  onCancel?: () => void;
}) {
  const { data: aiPlatforms = [] } = useGetAiPlatformsQuery();
  const aiModelOptions = useMemo(
    () => aiPlatforms.map((p) => ({ value: p.key, label: p.name })),
    [aiPlatforms],
  );

  return (
    <Form disabled={disabled}>
      <Stack gap="md">
        {/* 基本信息 + AI */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Title order={5}>{t`Basic Info & AI`}</Title>
            <Grid gutter="sm">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <FormTextInput
                  name="task_name"
                  label={t`Task Name`}
                  placeholder={t`Task name`}
                  required
                  autoFocus
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <FormTextInput
                  name="query_text"
                  label={t`Task Question`}
                  placeholder={t`Enter task question`}
                  required
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <FormSelect
                  name="platform_name"
                  label={t`AI Model`}
                  placeholder={t`Select AI model`}
                  data={aiModelOptions}
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <FormSelect
                  name="ai_mode"
                  label={t`AI Mode`}
                  placeholder={t`Select AI mode`}
                  data={AI_MODE_OPTIONS}
                  searchable
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>

        {/* 我品：品牌与关键词单独成区 */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Title order={5}>{t`Our product (我品) — Brand & Keywords`}</Title>
            <FormSelect
              name="product_brand"
              label={t`Task Brand Name`}
              placeholder={t`Select brand`}
              data={BRAND_OPTIONS}
              searchable
            />
            <FormTextInput
              name="product_keywords"
              label={t`Product Keywords`}
              placeholder={t`Enter product keywords`}
              nullable
            />
            <DynamicStringList
              name="selling_point_keywords"
              title={t`Selling Point Keywords`}
              description={t`Click + to add more.`}
              placeholder={t`Keyword`}
            />
          </Stack>
        </Paper>

        {/* 竞品：品牌与产品关键词 1:1 */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Title order={5}>{t`Competitor (竞品)`}</Title>
            <ComparisonBrandProductPairs />
          </Stack>
        </Paper>

        {/* 搜索频次：仅填写小时数，提交时转为 cron */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Title order={5}>{t`Schedule`}</Title>
            <FormNumberInput
              name="schedule_hours"
              label={t`Search Frequency (hours)`}
              placeholder={t`e.g. 6 for every 6 hours (1–24)`}
              min={1}
              max={24}
              nullable
            />
          </Stack>
        </Paper>

        <FormFooter>
          <FormErrorMessage inline />
          {onCancel && (
            <Button type="button" onClick={onCancel}>
              {t`Cancel`}
            </Button>
          )}
          <FormSubmitButton title={t`Execute`} disabled={disabled} />
        </FormFooter>
      </Stack>
    </Form>
  );
}

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
  Text,
  TextInput,
  Title,
} from "metabase/ui";

const MAX_COMPETITORS = 10;

interface CreateGeoTaskFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormValues {
  task_name: string;
  query_text: string;
  platform_name: string | null;
  ai_mode: string | null;
  product_brand: string;
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
  const { errors, submitCount, values, setFieldValue } =
    useFormikContext<FormValues>();
  const brands = values.comparison_brand_names || [""];
  const keywords = values.comparison_product_keywords || [""];
  const length = Math.max(brands.length, keywords.length, 1);
  const hasReachedMax = length >= MAX_COMPETITORS;
  const fieldError =
    submitCount > 0
      ? typeof errors.comparison_brand_names === "string"
        ? errors.comparison_brand_names
        : typeof errors.comparison_product_keywords === "string"
          ? errors.comparison_product_keywords
          : undefined
      : undefined;
  const brandsPadded = [...brands, ...Array(length - brands.length).fill("")];
  const keywordsPadded = [
    ...keywords,
    ...Array(length - keywords.length).fill(""),
  ];

  const addRow = () => {
    if (hasReachedMax) {
      return;
    }
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
      title={t`竞品品牌与产品关键词`}
      description={t`每行填写一个竞品品牌及其对应产品关键词。点击 + 添加一行，最多支持 10 个竞品。`}
      error={fieldError}
      mb="xs"
    >
      <Stack gap="xs">
        {brandsPadded.map((_, index) => (
          <Flex key={index} align="center" gap="sm" wrap="wrap">
            <TextInput
              value={brandsPadded[index]}
              onChange={(e) => updateBrand(index, e.target.value)}
              placeholder={t`品牌名称`}
              style={{ flex: 1, minWidth: 120 }}
            />
            <TextInput
              value={keywordsPadded[index]}
              onChange={(e) => updateKeywords(index, e.target.value)}
              placeholder={t`该品牌的产品关键词`}
              style={{ flex: 1, minWidth: 160 }}
            />
            <Button
              type="button"
              variant="filled"
              size="sm"
              onClick={addRow}
              title={t`添加一行`}
              aria-label={t`添加一行`}
              disabled={hasReachedMax}
            >
              <Icon name="add" />
            </Button>
            {length > 1 && (
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => removeRow(index)}
                title={t`删除一行`}
                aria-label={t`删除一行`}
              >
                <Icon name="close" />
              </Button>
            )}
          </Flex>
        ))}
        <Text size="sm" c={hasReachedMax ? "error" : "text-medium"}>
          {t`已添加竞品：${length}/${MAX_COMPETITORS}`}
        </Text>
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
              title={t`添加`}
              aria-label={t`添加`}
            >
              <Icon name="add" />
            </Button>
            {list.length > 1 && (
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => remove(index)}
                title={t`删除`}
                aria-label={t`删除`}
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
          .required(t`任务名称不能为空`)
          .max(200, t`任务名称不能超过 200 个字符`),
        query_text: Yup.string()
          .nullable()
          .max(500, t`任务问题不能超过 500 个字符`),
        platform_name: Yup.string().nullable(),
        ai_mode: Yup.string().nullable(),
        product_brand: Yup.string()
          .nullable()
          .max(200, t`品牌名称不能超过 200 个字符`),
        comparison_brand_names: Yup.array()
          .of(Yup.string())
          .max(MAX_COMPETITORS, t`最多支持 10 个竞品`),
        product_keywords: Yup.string().nullable(),
        comparison_product_keywords: Yup.array()
          .of(Yup.string())
          .max(MAX_COMPETITORS, t`最多支持 10 个竞品`),
        selling_point_keywords: Yup.array().of(Yup.string()),
        schedule_hours: Yup.number()
          .nullable()
          .integer(t`请输入整数`)
          .min(1, t`最小值为 1 小时`)
          .max(24, t`最大值为 24 小时（每天一次）`),
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
      product_brand: "",
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
    const brands = (values.comparison_brand_names || []).slice(
      0,
      MAX_COMPETITORS,
    );
    const keywords = (values.comparison_product_keywords || []).slice(
      0,
      MAX_COMPETITORS,
    );
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
  const aiModeOptions = useMemo(
    () => [{ value: "Search", label: t`搜索` }],
    [],
  );

  return (
    <Form disabled={disabled}>
      <Stack gap="md">
        {/* 基本信息 + AI */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Title order={5}>{t`基础信息与 AI 配置`}</Title>
            <Grid gutter="sm">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <FormTextInput
                  name="task_name"
                  label={t`任务名称`}
                  placeholder={t`请输入任务名称`}
                  required
                  autoFocus
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <FormTextInput
                  name="query_text"
                  label={t`任务问题`}
                  placeholder={t`请输入任务问题`}
                  required
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <FormSelect
                  name="platform_name"
                  label={t`AI 模型`}
                  placeholder={t`请选择 AI 模型`}
                  data={aiModelOptions}
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <FormSelect
                  name="ai_mode"
                  label={t`AI 模式`}
                  placeholder={t`请选择 AI 模式`}
                  data={aiModeOptions}
                  searchable
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>

        {/* 我品：品牌与关键词单独成区 */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Title order={5}>{t`我方产品信息`}</Title>
            <FormTextInput
              name="product_brand"
              label={t`品牌名称`}
              placeholder={t`请输入品牌名称`}
              nullable
            />
            <FormTextInput
              name="product_keywords"
              label={t`产品关键词`}
              placeholder={t`请输入产品关键词`}
              nullable
            />
            <DynamicStringList
              name="selling_point_keywords"
              title={t`卖点关键词`}
              description={t`点击 + 添加更多关键词。`}
              placeholder={t`请输入关键词`}
            />
          </Stack>
        </Paper>

        {/* 竞品：品牌与产品关键词 1:1 */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Title order={5}>{t`竞品信息`}</Title>
            <ComparisonBrandProductPairs />
          </Stack>
        </Paper>

        {/* 搜索频次：仅填写小时数，提交时转为 cron */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="sm">
            <Title order={5}>{t`日程`}</Title>
            <FormNumberInput
              name="schedule_hours"
              label={t`搜索频率（小时）`}
              placeholder={t`例如填写 6，表示每 6 小时执行一次（1-24）`}
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
              {t`取消`}
            </Button>
          )}
          <FormSubmitButton title={t`提交`} disabled={disabled} />
        </FormFooter>
      </Stack>
    </Form>
  );
}

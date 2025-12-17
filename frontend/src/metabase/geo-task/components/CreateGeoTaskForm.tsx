import { useMemo } from "react";
import { t } from "ttag";
import * as Yup from "yup";

import type { CreateGeoTaskRequest } from "metabase/api/geo-task";
import { useCreateGeoTaskMutation } from "metabase/api/geo-task";
import FormErrorMessage from "metabase/common/components/FormErrorMessage";
import { FormFooter } from "metabase/common/components/FormFooter";
import FormInput from "metabase/common/components/FormInput";
import FormTextArea from "metabase/common/components/FormTextArea";
import { Form, FormProvider, FormSubmitButton } from "metabase/forms";
import { FormCheckbox } from "metabase/forms/components/FormCheckbox";
import { Button } from "metabase/ui";

interface CreateGeoTaskFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CreateGeoTaskForm = ({
  onSuccess,
  onCancel,
}: CreateGeoTaskFormProps) => {
  const [createGeoTask, { isLoading }] = useCreateGeoTaskMutation();

  const geoTaskSchema = useMemo(
    () =>
      Yup.object({
        query_text: Yup.string()
          .required(t`Query text is required`)
          .max(500, t`Query text must be 500 characters or less`),
        platform_name: Yup.string().nullable(),
        usr_company_name: Yup.string().nullable(),
        brand_keywords: Yup.string().nullable(),
        enabled: Yup.boolean(),
        schedule_cron: Yup.string()
          .nullable()
          .max(100, t`Schedule cron must be 100 characters or less`),
      }),
    [],
  );

  const initialValues = useMemo(
    () => ({
      query_text: "",
      platform_name: "",
      usr_company_name: "",
      brand_keywords: "",
      enabled: true,
      schedule_cron: "",
    }),
    [],
  );

  const handleSubmit = async (values: CreateGeoTaskRequest) => {
    try {
      await createGeoTask(values).unwrap();
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
      <Form disabled={isLoading}>
        <FormInput
          name="query_text"
          title={t`Query Text`}
          placeholder={t`Enter query text`}
          required
          autoFocus
        />
        <FormInput
          name="platform_name"
          title={t`Platform Name`}
          placeholder={t`Enter platform name (optional)`}
          nullable
        />
        <FormInput
          name="usr_company_name"
          title={t`User Company Name`}
          placeholder={t`Enter user company name (optional)`}
          nullable
        />
        <FormTextArea
          name="brand_keywords"
          title={t`Brand Keywords`}
          placeholder={t`Enter brand keywords (optional)`}
          nullable
        />
        <FormInput
          name="schedule_cron"
          title={t`Schedule Cron`}
          placeholder={t`Enter cron expression (optional)`}
          nullable
        />
        <FormCheckbox
          name="enabled"
          title={t`Enabled`}
          label={t`Enable this task`}
        />
        <FormFooter>
          <FormErrorMessage inline />
          {onCancel && (
            <Button type="button" onClick={onCancel}>
              {t`Cancel`}
            </Button>
          )}
          <FormSubmitButton title={t`Create`} disabled={isLoading} />
        </FormFooter>
      </Form>
    </FormProvider>
  );
};

import { t } from "ttag";

import { usePageTitle } from "metabase/hooks/use-page-title";
import { useRouter } from "metabase/router";
import { Box, Button, Flex, Icon, Title } from "metabase/ui";

import { CreateGeoTaskForm } from "./components/CreateGeoTaskForm";
import { GeoTaskList } from "./components/GeoTaskList";

export const GeoTaskPage = () => {
  const { location, router } = useRouter();

  // Derive showCreateForm only from URL so that clicking "Geo任务" in sidebar (navigates to /geo-task) always shows list
  const showCreateForm =
    location?.query?.create === "true" ||
    String(location?.query?.create) === "true";

  usePageTitle(showCreateForm ? t`新建 GEO 任务` : t`GEO 任务`);

  const goToList = () => {
    router.replace({ pathname: "/geo-task", query: {} });
  };

  const handleCreateSuccess = () => {
    // List will refetch via RTK Query cache invalidation
    goToList();
  };

  const handleCancel = () => {
    goToList();
  };

  const openCreateForm = () => {
    router.replace({ pathname: "/geo-task", query: { create: "true" } });
  };

  return (
    <Box p="xl" style={{ maxWidth: "100%", width: "100%", margin: 0 }}>
      <Flex justify="space-between" align="center" mb="lg">
        <Title order={1}>
          {showCreateForm ? t`新建 GEO 任务` : t`GEO 任务`}
        </Title>
        {!showCreateForm && (
          <Button
            leftSection={<Icon name="add" />}
            onClick={openCreateForm}
            variant="filled"
          >
            {t`创建 GEO 任务`}
          </Button>
        )}
      </Flex>

      {showCreateForm ? (
        <Box mb="xl">
          <CreateGeoTaskForm
            onSuccess={handleCreateSuccess}
            onCancel={handleCancel}
          />
        </Box>
      ) : (
        <GeoTaskList />
      )}
    </Box>
  );
};

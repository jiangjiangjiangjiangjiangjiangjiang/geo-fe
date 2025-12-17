import type { Location } from "history";
import { useEffect, useState } from "react";
import { t } from "ttag";

import { usePageTitle } from "metabase/hooks/use-page-title";
import { Box, Button, Flex, Icon, Title } from "metabase/ui";

import { CreateGeoTaskForm } from "./components/CreateGeoTaskForm";
import { GeoTaskList } from "./components/GeoTaskList";

interface GeoTaskPageProps {
  location: Location;
}

export const GeoTaskPage = ({ location }: GeoTaskPageProps) => {
  usePageTitle(t`Geo Tasks`);
  const shouldShowCreateForm =
    location?.query?.create === "true" ||
    String(location?.query?.create) === "true";
  const [showCreateForm, setShowCreateForm] = useState(shouldShowCreateForm);

  // Clear the create query parameter when form is closed
  useEffect(() => {
    if (!showCreateForm && location?.query?.create) {
      const newQuery = { ...location.query };
      delete newQuery.create;
      // Note: In React Router 3, we'd typically use router.replace, but for simplicity
      // we'll just rely on the state management
    }
  }, [showCreateForm, location]);

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    // The list will automatically refetch due to RTK Query cache invalidation
    // Remove the create query parameter from URL
    if (location?.query?.create) {
      window.history.replaceState(
        null,
        document.title,
        window.location.pathname,
      );
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    // Remove the create query parameter from URL
    if (location?.query?.create) {
      window.history.replaceState(
        null,
        document.title,
        window.location.pathname,
      );
    }
  };

  return (
    <Box p="xl" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <Flex justify="space-between" align="center" mb="lg">
        <Title order={1}>{t`Geo Tasks`}</Title>
        {!showCreateForm && (
          <Button
            leftSection={<Icon name="add" />}
            onClick={() => setShowCreateForm(true)}
            variant="filled"
          >
            {t`Create Geo Task`}
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

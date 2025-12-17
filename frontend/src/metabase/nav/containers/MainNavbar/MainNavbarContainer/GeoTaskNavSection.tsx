import { t } from "ttag";

import CollapseSection from "metabase/common/components/CollapseSection";
import { useUserSetting } from "metabase/common/hooks";
import { ActionIcon, Icon, Tooltip } from "metabase/ui";

import { PaddedSidebarLink, SidebarHeading } from "../MainNavbar.styled";
import type { SelectedItem } from "../types";

interface GeoTaskNavSectionProps {
  nonEntityItem: SelectedItem;
  onItemSelect: () => void;
  onCreateGeoTask: () => void;
}

export const GeoTaskNavSection = ({
  nonEntityItem,
  onItemSelect,
  onCreateGeoTask,
}: GeoTaskNavSectionProps) => {
  const GEO_TASK_URL = "/geo-task";

  const [expandGeoTask = true, setExpandGeoTask] = useUserSetting(
    "expand-geo-task-in-nav",
  );

  return (
    <CollapseSection
      header={<SidebarHeading>{t`GeoTask`}</SidebarHeading>}
      initialState={expandGeoTask ? "expanded" : "collapsed"}
      iconPosition="right"
      iconSize={8}
      onToggle={setExpandGeoTask}
      rightAction={
        <Tooltip label={t`Create a new geo task`}>
          <ActionIcon
            aria-label={t`Create a new geo task`}
            color="var(--mb-color-text-medium)"
            onClick={onCreateGeoTask}
          >
            <Icon name="add" />
          </ActionIcon>
        </Tooltip>
      }
      role="section"
      aria-label={t`GeoTask`}
    >
      <PaddedSidebarLink
        icon="database"
        url={GEO_TASK_URL}
        isSelected={nonEntityItem?.url?.startsWith(GEO_TASK_URL)}
        onClick={onItemSelect}
        aria-label={t`Geo Tasks`}
      >
        {t`Geo Tasks`}
      </PaddedSidebarLink>
    </CollapseSection>
  );
};

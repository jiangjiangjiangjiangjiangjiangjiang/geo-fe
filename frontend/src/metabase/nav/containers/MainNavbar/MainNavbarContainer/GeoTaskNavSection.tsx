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

const GEO_TASK_URL = "/geo-task";
const SEO_SENTIMENT_JUDGMENT_URL = "/seo/sentiment-judgment";
const SEO_BRAND_SENTIMENT_RECOGNITION_URL = "/seo/brand-sentiment-recognition";

export const GeoTaskNavSection = ({
  nonEntityItem,
  onItemSelect,
  onCreateGeoTask,
}: GeoTaskNavSectionProps) => {
  const [expandGeoTask = true, setExpandGeoTask] = useUserSetting(
    "expand-geo-task-in-nav",
  );
  const [expandSeo = true, setExpandSeo] = useUserSetting("expand-seo-in-nav");

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
        aria-label={t`GeoTask`}
      >
        {t`Geo Tasks`}
      </PaddedSidebarLink>

      <CollapseSection
        header={<SidebarHeading>{t`SEO Management`}</SidebarHeading>}
        initialState={expandSeo ? "expanded" : "collapsed"}
        iconPosition="right"
        iconSize={8}
        onToggle={setExpandSeo}
        role="section"
        aria-label={t`SEO Management`}
      >
        <PaddedSidebarLink
          icon="sticky_note"
          url={SEO_SENTIMENT_JUDGMENT_URL}
          isSelected={nonEntityItem?.url?.startsWith(
            SEO_SENTIMENT_JUDGMENT_URL,
          )}
          onClick={onItemSelect}
          aria-label={t`Note sentiment judgment`}
        >
          {t`Note sentiment judgment`}
        </PaddedSidebarLink>
        <PaddedSidebarLink
          icon="sticky_note"
          url={SEO_BRAND_SENTIMENT_RECOGNITION_URL}
          isSelected={nonEntityItem?.url?.startsWith(
            SEO_BRAND_SENTIMENT_RECOGNITION_URL,
          )}
          onClick={onItemSelect}
          aria-label={t`笔记品牌情感识别`}
        >
          {t`笔记品牌情感识别`}
        </PaddedSidebarLink>
      </CollapseSection>
    </CollapseSection>
  );
};

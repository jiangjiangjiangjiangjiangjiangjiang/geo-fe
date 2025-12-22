// eslint-disable-next-line no-restricted-imports
import styled from "@emotion/styled";

const ICPFooterContainer = styled.footer`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 1rem;
  background-color: var(--mb-color-bg-white);
  border-top: 1px solid var(--mb-color-border);
  text-align: center;
  font-size: 12px;
  color: var(--mb-color-text-medium);
  flex-shrink: 0;

  @media print {
    display: none;
  }
`;

const ICPLink = styled.a`
  color: var(--mb-color-text-medium);
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: var(--mb-color-brand);
    text-decoration: underline;
  }
`;

// 备案号配置
// 方式1: 直接在此处设置备案号（推荐）
// 方式2: 通过环境变量 REACT_APP_ICP_BEIAN_NUMBER 设置
// 示例备案号格式: "京ICP备12345678号" 或 "粤ICP备12345678号-1"
const ICP_BEIAN_NUMBER =
  process.env.REACT_APP_ICP_BEIAN_NUMBER || "沪ICP备2025155371号-1";

export const ICPFooter = () => {
  // 如果没有配置备案号，不显示
  if (!ICP_BEIAN_NUMBER || ICP_BEIAN_NUMBER.trim() === "") {
    return null;
  }

  return (
    <ICPFooterContainer data-testid="icp-footer">
      <ICPLink
        href="http://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        {ICP_BEIAN_NUMBER}
      </ICPLink>
    </ICPFooterContainer>
  );
};

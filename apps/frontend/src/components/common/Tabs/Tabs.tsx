/**
 * Tabs - 공통 탭 네비게이션 컴포넌트
 *
 * variant:
 * - "pill" (기본): 배경색 pill 스타일
 * - "underline": 언더라인 스타일
 */

import { ReactNode, createContext, useContext } from 'react';
import './Tabs.css';

type TabsVariant = 'pill' | 'underline';

interface TabsContextValue {
  activeTab: string;
  onTabChange: (value: string) => void;
  variant: TabsVariant;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  variant?: TabsVariant;
}

export function Tabs({ value, onChange, children, className = '', variant = 'pill' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ activeTab: value, onTabChange: onChange, variant }}>
      <div className={`tabs tabs--${variant} ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className = '' }: TabListProps) {
  const context = useContext(TabsContext);
  const variant = context?.variant ?? 'pill';

  return (
    <div className={`tabs__list tabs__list--${variant} ${className}`} role="tablist">
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tab({ value, children, icon, disabled = false, className = '' }: TabProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  const { activeTab, onTabChange, variant } = context;
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      className={`tabs__tab tabs__tab--${variant} ${isActive ? 'tabs__tab--active' : ''} ${className}`}
      onClick={() => !disabled && onTabChange(value)}
      disabled={disabled}
      role="tab"
      aria-selected={isActive}
    >
      {icon && <span className="tabs__tab-icon">{icon}</span>}
      <span className="tabs__tab-label">{children}</span>
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className = '' }: TabPanelProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  const { activeTab } = context;

  if (activeTab !== value) return null;

  return (
    <div className={`tabs__panel ${className}`} role="tabpanel">
      {children}
    </div>
  );
}

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export default Tabs;

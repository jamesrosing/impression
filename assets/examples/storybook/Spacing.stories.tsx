import type { Meta, StoryObj } from '@storybook/react';

/**
 * Spacing scale extracted from https://linear.app/
 */
const meta: Meta = {
  title: 'Design System/Spacing',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

const SpacingBar = ({ value }: { value: string | number }) => {
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{
        width: '60px',
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#6b7280',
      }}>
        {value}{typeof value === 'number' ? 'px' : ''}
      </span>
      <div style={{
        width: Math.min(numValue * 4, 400),
        height: '24px',
        backgroundColor: '#3b82f6',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '8px',
        color: 'white',
        fontSize: '12px',
      }}>
        {numValue}px
      </div>
    </div>
  );
};

export const SpacingScale: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>Spacing Scale</h2>
      <SpacingBar value="4px" />
      <SpacingBar value="6px" />
      <SpacingBar value="8px" />
      <SpacingBar value="10px" />
      <SpacingBar value="12px" />
      <SpacingBar value="16px" />
      <SpacingBar value="20px" />
      <SpacingBar value="24px" />
      <SpacingBar value="32px" />
      <SpacingBar value="40px" />
      <SpacingBar value="48px" />
      <SpacingBar value="56px" />
    </>
  ),
};

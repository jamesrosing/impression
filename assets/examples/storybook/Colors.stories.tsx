import type { Meta, StoryObj } from '@storybook/react';

/**
 * Color palette extracted from https://linear.app/
 */
const meta: Meta = {
  title: 'Design System/Colors',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

const ColorSwatch = ({ name, value, textColor = '#000' }: { name: string; value: string; textColor?: string }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    width: '150px',
  }}>
    <div style={{
      backgroundColor: value,
      height: '80px',
      borderRadius: '8px 8px 0 0',
      display: 'flex',
      alignItems: 'flex-end',
      padding: '8px',
      color: textColor,
      fontSize: '12px',
      fontFamily: 'monospace',
    }}>
      {value}
    </div>
    <div style={{
      padding: '8px',
      backgroundColor: '#f8f9fa',
      borderRadius: '0 0 8px 8px',
      fontSize: '14px',
      fontWeight: 500,
    }}>
      {name}
    </div>
  </div>
);

const ColorGrid = ({ colors }: { colors: Array<{ name: string; value: string }> }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '16px',
  }}>
    {colors.map((color) => (
      <ColorSwatch key={color.name} {...color} />
    ))}
  </div>
);

export const SemanticColors: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>Semantic Colors</h2>
      <ColorGrid colors={[{"name":"Background 1","value":"#0f1011"},{"name":"Background 2","value":"#ffffff"},{"name":"Background 3","value":"#08090a"},{"name":"Background 4","value":"#28282c"},{"name":"Background 5","value":"#1c1c1f"},{"name":"Background 6","value":"#18191a"},{"name":"Background 7","value":"#141516"},{"name":"Text 1","value":"#f7f8f8"},{"name":"Text 2","value":"#8a8f98"},{"name":"Text 3","value":"#d0d6e0"},{"name":"Text 4","value":"#62666d"},{"name":"Text 5","value":"#ffffff"},{"name":"Text 6","value":"#68cc58"}]} />
    </>
  ),
};

export const Palette: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>Color Palette</h2>
      <ColorGrid colors={[{"name":"Color 1","value":"#f7f8f8"},{"name":"Color 2","value":"#8a8f98"},{"name":"Color 3","value":"#d0d6e0"},{"name":"Color 4","value":"#62666d"},{"name":"Color 5","value":"#ffffff"},{"name":"Color 6","value":"#0f1011"},{"name":"Color 7","value":"#08090a"},{"name":"Color 8","value":"#68cc58"},{"name":"Color 9","value":"#5e6ad2"},{"name":"Color 10","value":"#28282c"},{"name":"Color 11","value":"#1c1c1f"},{"name":"Color 12","value":"#3e3e44"}]} />
    </>
  ),
};

export const CSSVariables: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>CSS Variables</h2>
      <ColorGrid colors={[{"name":"----color-white","value":"#fff"},{"name":"----color-black","value":"#000"},{"name":"----color-blue","value":"#4ea7fc"},{"name":"----color-red","value":"#eb5757"},{"name":"----color-green","value":"#4cb782"},{"name":"----color-orange","value":"#fc7840"},{"name":"----color-yellow","value":"#f2c94c"},{"name":"----color-indigo","value":"#5e6ad2"},{"name":"----color-linear-plan","value":"#68cc58"},{"name":"----color-linear-build","value":"#d4b144"},{"name":"----color-linear-security","value":"#7a7fad"},{"name":"----font-regular","value":"\"Inter Variable\",\"SF Pro Display\",-apple-system,BlinkMacSystemFont,\"Segoe UI\",\"Roboto\",\"Oxygen\",\"Ubuntu\",\"Cantarell\",\"Open Sans\",\"Helvetica Neue\",sans-serif"},{"name":"----font-serif-display","value":"\"Tiempos Headline\",ui-serif,Georgia,Cambria,\"Times New Roman\",Times,serif"},{"name":"----font-monospace","value":"\"Berkeley Mono\",ui-monospace,\"SF Mono\",\"Menlo\",monospace"},{"name":"----font-weight-light","value":"300"}]} />
    </>
  ),
};

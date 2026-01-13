import type { Meta, StoryObj } from '@storybook/react';

/**
 * Typography specimens extracted from https://linear.app/
 */
const meta: Meta = {
  title: 'Design System/Typography',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

const FontSpecimen = ({ family, weights }: { family: string; weights: number[] }) => (
  <div style={{
    padding: '24px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '16px',
  }}>
    <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
      {family}
    </div>
    <div style={{
      fontFamily: `"${family}", system-ui`,
      fontSize: '32px',
      marginBottom: '16px',
    }}>
      The quick brown fox jumps over the lazy dog
    </div>
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      {weights.map((weight) => (
        <span
          key={weight}
          style={{
            fontFamily: `"${family}", system-ui`,
            fontWeight: weight,
            fontSize: '16px',
          }}
        >
          {weight}
        </span>
      ))}
    </div>
  </div>
);

const SizeScale = ({ sizes }: { sizes: string[] }) => (
  <div>
    {sizes.map((size) => (
      <div
        key={size}
        style={{
          fontSize: size,
          padding: '8px 0',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <span style={{ color: '#6b7280', fontSize: '12px', marginRight: '16px', fontFamily: 'monospace' }}>
          {size}
        </span>
        Sample Text
      </div>
    ))}
  </div>
);

export const FontFamilies: StoryObj = {
  render: () => (
    <>
      <h2 style={{ marginBottom: '16px' }}>Font Families</h2>
      <FontSpecimen family="Inter Variable" weights={["400","510","538","590","680"]} />
      <FontSpecimen family="Berkeley Mono" weights={["400","510","538","590","680"]} />
    </>
  ),
};



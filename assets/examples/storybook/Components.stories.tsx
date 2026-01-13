import type { Meta, StoryObj } from '@storybook/react';

/**
 * Component patterns extracted from https://linear.app/
 */
const meta: Meta = {
  title: 'Design System/Components',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

// Button component with design system styles
const Button = ({
  variant = 'primary',
  size = 'md',
  children,
}: {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: '4px',
    transition: 'all 150ms ease',
    cursor: 'pointer',
    border: 'none',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#5e6ad2',
      color: 'white',
    },
    secondary: {
      backgroundColor: '#f3f4f6',
      color: '#111827',
    },
    outline: {
      backgroundColor: 'transparent',
      border: '1px solid #d1d5db',
      color: '#111827',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#111827',
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { height: '32px', padding: '0 12px', fontSize: '14px' },
    md: { height: '40px', padding: '0 16px', fontSize: '14px' },
    lg: { height: '48px', padding: '0 24px', fontSize: '16px' },
  };

  return (
    <button style={{ ...baseStyles, ...variantStyles[variant], ...sizeStyles[size] }}>
      {children}
    </button>
  );
};

export const Buttons: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ marginBottom: '12px', color: '#6b7280' }}>Variants</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', color: '#6b7280' }}>Sizes</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>
    </div>
  ),
};

// Input component
const Input = ({
  label,
  placeholder,
  error,
}: {
  label?: string;
  placeholder?: string;
  error?: string;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    {label && (
      <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
        {label}
      </label>
    )}
    <input
      placeholder={placeholder}
      style={{
        padding: '8px 12px',
        border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
        borderRadius: '4px',
        fontSize: '14px',
        outline: 'none',
      }}
    />
    {error && (
      <span style={{ fontSize: '12px', color: '#ef4444' }}>{error}</span>
    )}
  </div>
);

export const Inputs: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '300px' }}>
      <Input label="Default" placeholder="Enter text..." />
      <Input label="With Error" placeholder="Invalid input" error="This field is required" />
    </div>
  ),
};

// Card component
const Card = ({
  variant = 'default',
  children,
}: {
  variant?: 'default' | 'elevated' | 'outlined';
  children: React.ReactNode;
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
    },
    elevated: {
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    outlined: {
      backgroundColor: 'transparent',
      border: '2px solid #e5e7eb',
    },
  };

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '6px',
        ...variantStyles[variant],
      }}
    >
      {children}
    </div>
  );
};

export const Cards: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
      <Card variant="default">
        <h4 style={{ margin: '0 0 8px' }}>Default</h4>
        <p style={{ margin: 0, color: '#6b7280' }}>Card with border</p>
      </Card>
      <Card variant="elevated">
        <h4 style={{ margin: '0 0 8px' }}>Elevated</h4>
        <p style={{ margin: 0, color: '#6b7280' }}>Card with shadow</p>
      </Card>
      <Card variant="outlined">
        <h4 style={{ margin: '0 0 8px' }}>Outlined</h4>
        <p style={{ margin: 0, color: '#6b7280' }}>Card with thick border</p>
      </Card>
    </div>
  ),
};

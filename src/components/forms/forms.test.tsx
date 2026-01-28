/**
 * Form Component Tests
 *
 * Tests for form primitives: TextInput, Slider, Checkbox
 * P4 task for AUDIT-001 resolution.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextInput } from './TextInput';
import { Slider } from './Slider';
import { Checkbox } from './Checkbox';

// Mock CheckIcon for Checkbox tests
vi.mock('../icons', () => ({
  CheckIcon: () => <span data-testid="check-icon">✓</span>,
}));

describe('TextInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders input element', () => {
      render(<TextInput {...defaultProps} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('displays current value', () => {
      render(<TextInput {...defaultProps} value="Hello" />);
      expect(screen.getByRole('textbox')).toHaveValue('Hello');
    });

    it('shows placeholder', () => {
      render(<TextInput {...defaultProps} placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });
  });

  describe('controlled input', () => {
    it('calls onChange with new value', () => {
      const onChange = vi.fn();
      render(<TextInput {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New value' } });

      expect(onChange).toHaveBeenCalledWith('New value');
    });

    it('respects maxLength', () => {
      render(<TextInput {...defaultProps} maxLength={5} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '5');
    });
  });

  describe('submit behavior', () => {
    it('calls onSubmit on Enter key', () => {
      const onSubmit = vi.fn();
      render(<TextInput {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

      expect(onSubmit).toHaveBeenCalled();
    });

    it('does not crash when onSubmit not provided', () => {
      render(<TextInput {...defaultProps} />);
      expect(() => {
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      }).not.toThrow();
    });
  });

  describe('label and helper text', () => {
    it('shows label when provided', () => {
      render(<TextInput {...defaultProps} label="Your Name" />);
      expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
    });

    it('shows helper text', () => {
      render(<TextInput {...defaultProps} helperText="Enter your full name" />);
      expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    });

    it('shows error instead of helper text when error present', () => {
      render(<TextInput {...defaultProps} helperText="Help" error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.queryByText('Help')).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disables input when disabled=true', () => {
      render(<TextInput {...defaultProps} disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('sets data-disabled on wrapper', () => {
      const { container } = render(<TextInput {...defaultProps} disabled />);
      expect(container.querySelector('[data-disabled="true"]')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('sets aria-invalid when error present', () => {
      render(<TextInput {...defaultProps} error="Error!" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-describedby for helper text', () => {
      render(<TextInput {...defaultProps} helperText="Help text" id="test-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-helper');
    });

    it('passes autoFocus to input', () => {
      render(<TextInput {...defaultProps} autoFocus />);
      // autoFocus in React results in the input having focus, not an attribute
      expect(document.activeElement).toBe(screen.getByRole('textbox'));
    });
  });
});

describe('Slider', () => {
  const defaultProps = {
    value: null as number | null,
    onChange: vi.fn(),
    minLabel: 'Low',
    maxLabel: 'High',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders slider with role="slider"', () => {
      render(<Slider {...defaultProps} />);
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('shows min and max labels', () => {
      render(<Slider {...defaultProps} minLabel="Not at all" maxLabel="Very much" />);
      expect(screen.getByText(/Not at all/)).toBeInTheDocument();
      expect(screen.getByText(/Very much/)).toBeInTheDocument();
    });

    it('shows label when provided', () => {
      render(<Slider {...defaultProps} label="Rate your energy" />);
      expect(screen.getByText('Rate your energy')).toBeInTheDocument();
    });

    it('renders correct number of points (default 5)', () => {
      const { container } = render(<Slider {...defaultProps} />);
      expect(container.querySelectorAll('.slider-point').length).toBe(5);
    });

    it('renders custom range of points', () => {
      const { container } = render(<Slider {...defaultProps} min={1} max={10} />);
      expect(container.querySelectorAll('.slider-point').length).toBe(10);
    });
  });

  describe('value selection', () => {
    it('calls onChange when point clicked', () => {
      const onChange = vi.fn();
      const { container } = render(<Slider {...defaultProps} onChange={onChange} />);

      const points = container.querySelectorAll('.slider-point');
      fireEvent.click(points[2]); // Third point (value 3)

      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('marks selected point with data-selected', () => {
      const { container } = render(<Slider {...defaultProps} value={3} />);

      const points = container.querySelectorAll('.slider-point');
      expect(points[2]).toHaveAttribute('data-selected', 'true');
      expect(points[0]).toHaveAttribute('data-selected', 'false');
    });
  });

  describe('keyboard navigation', () => {
    it('decreases value with ArrowLeft', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={3} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('increases value with ArrowRight', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={3} onChange={onChange} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalledWith(4);
    });

    it('goes to min with Home key', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={3} onChange={onChange} min={1} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'Home' });

      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('goes to max with End key', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={3} onChange={onChange} max={5} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });

      expect(onChange).toHaveBeenCalledWith(5);
    });

    it('does not go below min', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={1} onChange={onChange} min={1} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowLeft' });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not go above max', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={5} onChange={onChange} max={5} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('ignores keyboard input when disabled', () => {
      const onChange = vi.fn();
      render(<Slider {...defaultProps} value={3} onChange={onChange} disabled />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores clicks when disabled', () => {
      const onChange = vi.fn();
      const { container } = render(<Slider {...defaultProps} onChange={onChange} disabled />);

      fireEvent.click(container.querySelectorAll('.slider-point')[0]);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('sets tabIndex=-1 when disabled', () => {
      render(<Slider {...defaultProps} disabled />);
      expect(screen.getByRole('slider')).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('accessibility', () => {
    it('sets aria-valuemin and aria-valuemax', () => {
      render(<Slider {...defaultProps} min={1} max={10} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '1');
      expect(slider).toHaveAttribute('aria-valuemax', '10');
    });

    it('sets aria-valuenow when value selected', () => {
      render(<Slider {...defaultProps} value={3} />);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
    });

    it('sets aria-valuetext with context', () => {
      render(<Slider {...defaultProps} value={3} minLabel="Low" maxLabel="High" />);
      expect(screen.getByRole('slider')).toHaveAttribute(
        'aria-valuetext',
        '3 of 5, between Low and High'
      );
    });

    it('sets aria-valuetext to "No selection" when null', () => {
      render(<Slider {...defaultProps} value={null} />);
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'No selection');
    });
  });
});

describe('Checkbox', () => {
  const defaultProps = {
    checked: false,
    onChange: vi.fn(),
    label: 'Accept terms',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders checkbox input', () => {
      render(<Checkbox {...defaultProps} />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('shows label', () => {
      render(<Checkbox {...defaultProps} label="Subscribe to newsletter" />);
      expect(screen.getByText('Subscribe to newsletter')).toBeInTheDocument();
    });

    it('shows description when provided', () => {
      render(<Checkbox {...defaultProps} description="We will never spam you" />);
      expect(screen.getByText('We will never spam you')).toBeInTheDocument();
    });
  });

  describe('controlled checkbox', () => {
    it('reflects checked state', () => {
      render(<Checkbox {...defaultProps} checked={true} />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('reflects unchecked state', () => {
      render(<Checkbox {...defaultProps} checked={false} />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('calls onChange with new checked state', () => {
      const onChange = vi.fn();
      render(<Checkbox {...defaultProps} checked={false} onChange={onChange} />);

      fireEvent.click(screen.getByRole('checkbox'));

      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('calls onChange with false when unchecking', () => {
      const onChange = vi.fn();
      render(<Checkbox {...defaultProps} checked={true} onChange={onChange} />);

      fireEvent.click(screen.getByRole('checkbox'));

      expect(onChange).toHaveBeenCalledWith(false);
    });
  });

  describe('visual indicator', () => {
    it('shows check icon when checked', () => {
      render(<Checkbox {...defaultProps} checked={true} />);
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('hides check icon when unchecked', () => {
      render(<Checkbox {...defaultProps} checked={false} />);
      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disables checkbox when disabled=true', () => {
      render(<Checkbox {...defaultProps} disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('sets data-disabled on wrapper', () => {
      const { container } = render(<Checkbox {...defaultProps} disabled />);
      expect(container.querySelector('[data-disabled="true"]')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('associates label with checkbox via htmlFor', () => {
      render(<Checkbox {...defaultProps} id="terms-checkbox" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('id', 'terms-checkbox');
    });

    it('is clickable via label', () => {
      const onChange = vi.fn();
      render(<Checkbox {...defaultProps} onChange={onChange} />);

      // Click on the label text
      fireEvent.click(screen.getByText('Accept terms'));

      expect(onChange).toHaveBeenCalled();
    });
  });
});

'use client';

/**
 * SimpleInputWrapper - Handles simple input tools (former prompts)
 * Renders textarea, slider, checkbox, checkbox_group, radio, select, text_input
 * based on tool_type from the migrated prompts table.
 */

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { TextArea, Slider, Checkbox, CheckboxGroup, RadioGroup, Select, TextInput } from '@/components/forms';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';
import type { InputConfig, ToolType } from '../types';

interface SimpleInputWrapperProps extends ToolWrapperProps {
  toolType: ToolType;
  promptText?: string | null;  // Label for the input (usually NULL)
  inputConfig?: InputConfig;
}

export const SimpleInputWrapper = forwardRef<ToolWrapperRef, SimpleInputWrapperProps>(function SimpleInputWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
  toolType,
  promptText,
  inputConfig,
}, ref) { // code_id:921
  // State for different input types
  const [textValue, setTextValue] = useState('');
  const [sliderValue, setSliderValue] = useState(
    inputConfig?.min !== undefined
      ? Math.floor((inputConfig.min + (inputConfig.max || 10)) / 2)
      : 5
  );
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [checkboxGroupValue, setCheckboxGroupValue] = useState<string[]>([]);
  const [radioValue, setRadioValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  // Load initialData for read-only mode or edit
  useEffect(() => {
    if (initialData) {
      try {
        // initialData is JSON-stringified, so parse it first
        const parsed = JSON.parse(initialData);

        switch (toolType) {
          case 'textarea':
          case 'text_input':
            setTextValue(typeof parsed === 'string' ? parsed : initialData);
            break;
          case 'slider':
            setSliderValue(typeof parsed === 'number' ? parsed : parseInt(initialData, 10) || 5);
            break;
          case 'checkbox':
            setCheckboxValue(parsed === 'yes' || parsed === true);
            break;
          case 'checkbox_group':
            if (Array.isArray(parsed)) {
              setCheckboxGroupValue(parsed);
            } else if (typeof parsed === 'string') {
              setCheckboxGroupValue(parsed.split(', ').filter(Boolean));
            }
            break;
          case 'radio':
          case 'select':
            setRadioValue(typeof parsed === 'string' ? parsed : initialData);
            setSelectValue(typeof parsed === 'string' ? parsed : initialData);
            break;
        }
      } catch (err) {
        // If JSON parse fails, use raw value (legacy data)
        console.error('[SimpleInputWrapper] Failed to parse initialData:', err);
        if (toolType === 'textarea' || toolType === 'text_input') {
          setTextValue(initialData);
        }
      }
    }
  }, [initialData, toolType]);

  // Fetch connected data if provided (for pre-population)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;

        const data = result.data;

        // Handle different data types based on tool type
        if (typeof data === 'string') {
          // Direct string value
          if (toolType === 'textarea' || toolType === 'text_input') {
            setTextValue(data);
          } else if (toolType === 'radio' || toolType === 'select') {
            setRadioValue(data);
            setSelectValue(data);
          }
        } else if (typeof data === 'number') {
          // Numeric value for sliders
          if (toolType === 'slider') {
            setSliderValue(data);
          }
        } else if (typeof data === 'boolean') {
          // Boolean for checkbox
          if (toolType === 'checkbox') {
            setCheckboxValue(data);
          }
        } else if (Array.isArray(data)) {
          // Array data - format depends on tool type
          if (toolType === 'textarea' || toolType === 'text_input') {
            // Convert array to comma-separated list (e.g., skills list)
            const names = data.map((item: { name?: string; value?: string }) => item.name || item.value || '').filter(Boolean);
            setTextValue(names.join(', '));
          } else if (toolType === 'checkbox_group') {
            // Extract IDs/values for checkbox group
            const values = data.map((item: { id?: string; value?: string }) => item.id || item.value || '').filter(Boolean);
            setCheckboxGroupValue(values);
          }
        }
      })
      .catch(err => console.error('[SimpleInputWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData, toolType]);

  // Get the current value based on tool type
  const getData = useCallback(() => {
    switch (toolType) {
      case 'textarea':
      case 'text_input':
        return textValue;
      case 'slider':
        return sliderValue.toString();
      case 'checkbox':
        return checkboxValue ? 'yes' : 'no';
      case 'checkbox_group':
        return checkboxGroupValue.join(', ');
      case 'radio':
        return radioValue;
      case 'select':
        return selectValue;
      default:
        return '';
    }
  }, [toolType, textValue, sliderValue, checkboxValue, checkboxGroupValue, radioValue, selectValue]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
  });

  // Check if tool has valid input
  const isValid = useCallback(() => {
    switch (toolType) {
      case 'textarea':
      case 'text_input':
        return textValue.trim().length > 0;
      case 'slider':
        // Sliders always have a default value, so they're always valid
        return true;
      case 'checkbox':
        // Checkboxes have a boolean state, always valid
        return true;
      case 'checkbox_group':
        // At least one checkbox must be selected
        return checkboxGroupValue.length > 0;
      case 'radio':
        return radioValue !== '';
      case 'select':
        return selectValue !== '';
      default:
        return true;
    }
  }, [toolType, textValue, checkboxGroupValue, radioValue, selectValue]);

  // Expose save and isValid methods to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      await save();
    },
    isValid,
  }), [save, isValid]);

  // Render the appropriate input based on tool type
  const renderInput = () => { // code_id:922
    const config = inputConfig || {};
    const id = `simple-input-${stemId}`;

    switch (toolType) {
      case 'textarea':
        return (
          <TextArea
            id={id}
            value={textValue}
            onChange={setTextValue}
            placeholder={config.placeholder || 'Type your response...'}
            disabled={readOnly}
            minRows={4}
          />
        );

      case 'text_input':
        return (
          <TextInput
            id={id}
            value={textValue}
            onChange={setTextValue}
            placeholder={config.placeholder || 'Type here...'}
            disabled={readOnly}
          />
        );

      case 'slider':
        return (
          <Slider
            id={id}
            value={sliderValue}
            min={config.min || 1}
            max={config.max || 10}
            minLabel={config.minLabel || config.labels?.[0] || 'Low'}
            maxLabel={config.maxLabel || config.labels?.[1] || 'High'}
            onChange={setSliderValue}
            disabled={readOnly}
          />
        );

      case 'checkbox':
        return (
          <Checkbox
            id={id}
            label="Yes"
            checked={checkboxValue}
            onChange={setCheckboxValue}
            disabled={readOnly}
          />
        );

      case 'checkbox_group': {
        const checkboxOptions = (config.options || []).map((opt, idx) => ({
          id: `${id}-opt-${idx}`,
          value: opt.value,
          label: opt.label,
        }));
        return (
          <CheckboxGroup
            id={id}
            options={checkboxOptions}
            selected={checkboxGroupValue}
            onChange={setCheckboxGroupValue}
            disabled={readOnly}
          />
        );
      }

      case 'radio': {
        const radioOptions = (config.options || []).map((opt, idx) => ({
          id: `${id}-opt-${idx}`,
          value: opt.value,
          label: opt.label,
        }));
        return (
          <RadioGroup
            id={id}
            options={radioOptions}
            value={radioValue}
            onChange={setRadioValue}
            disabled={readOnly}
          />
        );
      }

      case 'select': {
        const selectOptions = (config.options || []).map((opt, idx) => ({
          id: `${id}-opt-${idx}`,
          value: opt.value,
          label: opt.label,
        }));
        return (
          <Select
            id={id}
            options={selectOptions}
            value={selectValue}
            onChange={setSelectValue}
            placeholder="Select an option..."
            disabled={readOnly}
          />
        );
      }

      default:
        return <p>Unknown input type: {toolType}</p>;
    }
  };

  // Read-only mode for completed inputs in history
  if (readOnly) {
    return (
      <div className="tool-completed-view simple-input-readonly">
        {promptText && <p className="simple-input-label">{promptText}</p>}
        {renderInput()}
      </div>
    );
  }

  return (
    <div className="simple-input-wrapper">
      {promptText && <p className="simple-input-label">{promptText}</p>}
      {renderInput()}
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </div>
  );
});

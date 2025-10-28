import {Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import {ChevronDown} from "lucide-react";
import React from 'react';

type SelectOption = {
    value: string | number;
    label: string;
}

export default function KitSelect({
  label,
  defaultValue,
  onChange,
  options,
  multiple = false,
  placeholder = 'Choose an option...',
  valueTransform,
  ...props
}: {
  label?: string;
  defaultValue?: SelectOption | SelectOption[];
  onChange?: (option: string) => void;
  options: SelectOption[];
  multiple?: boolean;
  placeholder?: string;
  valueTransform?: (value: string | number) => string | number;
  [x: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const [selected, setSelected] = React.useState<SelectOption|SelectOption[]|undefined>(defaultValue);

  const multiselect = Array.isArray(selected) && multiple;

  console.log('selected', valueTransform);

  React.useEffect(() => {
    if (onChange) {
      if (multiselect) {
        onChange((selected as SelectOption[]).map((s) => s.label).join(', ') ?? '');
      } else if (selected) {
        onChange((selected as SelectOption).label ?? '');
      }
    }
  }, [selected, onChange, multiselect]);

  return (
    <label className="flex flex-col gap-1 text-kit-sm">
      {label && <span>{label}</span>}
      <Listbox value={selected} onChange={setSelected} multiple={multiple}>
        {({ open }) => (
          <>
            <ListboxButton
              as={React.Fragment}
              {...props}
            >
              {({ open }) => (
                <button
                  type="button"
                  className={`p-2 px-4 flex items-center gap-1 min-h-[40px]
                  transition-all duration-300 focus:outline-0 focus:ring-2 focus: ring-zurich ring-offset-2
                  hover:border-kit-gray-dark border-2
                  ${open ? 'border-b-transparent hover:border-b-transparent rounded-t-[25px] border-kit-gray-dark' : 'rounded-[40px]  border-kit-gray-medium'}`}
                >
                  {!selected
                    ? (<span className="text-kit-gray">{placeholder}</span>)
                    : multiselect
                      ? selected.map((s: SelectOption) => s.label).join(', ')
                      : (selected as SelectOption)?.label
                  }
                  <ChevronDown size={16} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              )}
            </ListboxButton>
            <AnimatePresence>
              {open && (
                <ListboxOptions
                  static
                  as={motion.div}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  anchor="bottom start"
                  className={`bg-white rounded-b-[20px] shadow-lg border-2
                  ${open ? 'border-kit-gray-dark' : 'border-kit-gray-medium'} focus:outline-0`}
                  style={{ width: 'var(--button-width)' }}
                >
                  {options.map((option) => (
                    <ListboxOption key={option.value} value={option} as={React.Fragment}>
                      {({ focus }) => (
                        <div className={`px-4 py-2 text-kit-sm cursor-pointer ${focus ? 'bg-kit-gray-medium' : ''}`}>
                          {option.label}
                        </div>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              )}
            </AnimatePresence>
          </>
        )}
      </Listbox>
    </label>
  )
}

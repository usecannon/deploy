import {
    Box,
    Editable,
    EditableInput, EditablePreview, HStack, Popover, PopoverAnchor, PopoverBody, PopoverContent, PopoverTrigger, Text, VStack
} from '@chakra-ui/react'
import { useState } from 'react';

import _ from 'lodash';

export function EditableAutocompleteInput(props: { items: { label: string, secondary: string }[], tabKeys?: string, placeholder?: string, onChange: (item: string) => void, color: string, onPending?: (item: string) => void, onFilterChange?: (text: string) => void }) {
    const [filterInput, setFilterInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [pendingItem, setPendingItem] = useState('');

    const filteredItems = _.sortBy(
        props.items.filter(i => i.label.toLowerCase().includes(filterInput.toLowerCase())), 
        i => !i.label.toLowerCase().startsWith(filterInput.toLowerCase())
    );

    const completedText = pendingItem.toLowerCase().startsWith(filterInput.toLowerCase()) ? pendingItem.slice(filterInput.length) : '';

    if (filteredItems.length > 0 && !filteredItems.find(i => i.label === pendingItem)) {
        setPendingItem(filteredItems[0].label);
        if (props.onPending) props.onPending(filteredItems[0].label);
    }

    const finishEdit = () => {
        setIsEditing(false)

        // must select a valid item from the autocomplete. See if we can do this
        let result = '';
        if (filteredItems.length) {
            result = pendingItem
        }

        setFilterInput(result)
        props.onChange(result)
    }

    const handleKey: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
        console.log('handle key', event.key);
        if (event.key == 'Enter' || event.key == 'Return' || event.key == 'Tab' || (props.tabKeys || '').includes(event.key)) {
            // perform "tab"
            event.preventDefault();

            const tabElements = Array.from(document
                // Get all elements that can be focusable
                // removed [tabindex] from query selector
              .querySelectorAll('a, button, input, textarea, select, details, [tabindex]'))
              
              // remove any that have a tabIndex of -1
              .filter(element => (element as any).tabIndex > -1)
              
              // split elements into two arrays, explicit tabIndexs and implicit ones
              .reduce((prev, next) => {  
                  return (next as any).tabIndex > 0
                    ? [[...prev[0], next].sort((a, b) => a.tabIndex > b.tabIndex ? -1 : 1), prev[1]]
                    : [prev[0], [...prev[1], next]];
                  }, [[], []])
                  
              // flatten the two-dimensional array
                .flatMap(element => element);
                
            const currentIndex = tabElements.findIndex(e => e === document.activeElement);
            const nextIndex = (currentIndex + 1) % tabElements.length;
            tabElements[nextIndex].focus();
        }

        if (event.key == 'ArrowDown' || event.key == 'ArrowUp') {
            event.preventDefault();

            const newIdx = Math.max(0, Math.min(filteredItems.length, filteredItems.findIndex(i => i.label === pendingItem) + (event.key == 'ArrowDown' ? 1 : -1)))

            setPendingItem(filteredItems[newIdx].label);
            if (props.onPending) props.onPending(filteredItems[newIdx].label);

        }
    }

    const inputValue = filterInput || (isEditing ? '' : props.placeholder);

    return (
        <Popover
            autoFocus={false}
            isOpen={isEditing && filteredItems.length > 0}
            placement='bottom-start'
            returnFocusOnClose={false}
            isLazy
        >
            <PopoverAnchor>
                <HStack color={props.color} gap={0}>
                    <Editable onEdit={() => setIsEditing(true)} onBlur={finishEdit} onKeyDown={handleKey} onChange={(value) => { setFilterInput(value); if(props.onFilterChange) props.onFilterChange(value) }} value={inputValue} color={filterInput ? props.color || 'black' : 'gray.500'} fontFamily={'monospace'}>
                        <EditablePreview />
                        <EditableInput outline='none' width={`${inputValue.length}ch`} />
                    </Editable>
                    {isEditing && <Text color='gray.500'>{completedText}</Text>}
                </HStack>
            </PopoverAnchor>
            <PopoverContent margin='-5px'>
                <PopoverBody padding='5px'>
                    <VStack maxHeight='500px' alignItems='left' overflow={'hidden'}>
                        {filteredItems.map(item => {
                            return <AutocompleteOption item={item} filterInput={filterInput} selected={item.label === pendingItem} />
                        })}
                    </VStack>
                </PopoverBody>
            </PopoverContent>
        </Popover>
    )
}


function AutocompleteOption(props: { item: {label: string, secondary: string}, filterInput: string, selected?: boolean }) { 

    const matched = props.filterInput ? props.item.label.split(new RegExp(props.filterInput, 'i')) : [props.item.label]

    return <Box background={props.selected ? 'gray.200' : 'transparent'}>
        <HStack gap={0}>
            {matched.map((p, i) => [<Text>{p}</Text>, i < matched.length - 1 ? <Text as='b'>{props.filterInput}</Text> : []]) }
        </HStack>
        <Text color='gray.600' fontSize='2xs'>{props.item.secondary}</Text>
    </Box>
}
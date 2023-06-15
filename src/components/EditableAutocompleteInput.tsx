import {
    Box,
    Editable,
    EditableInput, EditablePreview, HStack, Popover, PopoverContent, PopoverTrigger, Text, VStack
} from '@chakra-ui/react'
import { useState } from 'react';

function AutocompleteOption(props: { item: {label: string, secondary: string}, filterInput: string, selected?: boolean }) { 

    const matched = props.item.label.split(props.filterInput)

    return <Box>
        <HStack>
            {matched.map((p, i) => [<Text>{p}</Text>, i < matched.length - 1 ? <Text as='b'>{props.filterInput}</Text> : <Text color='gray.600' fontSize='sm'>{props.item.secondary}</Text>]) }
        </HStack>
    </Box>
}

export function EditableAutocompleteInput(props: { items: { label: string, secondary: string }[], placeholder?: string, onChange: (item: string) => void }) {
    const [filterInput, setFilterInput] = useState('');
    const [hoveredAutocompleteItem, setHoveredAutocompleteItem] = useState('');

    const completedText = hoveredAutocompleteItem.startsWith(filterInput) ? hoveredAutocompleteItem.slice(filterInput.length) : '';

    const filteredItems = props.items.filter(i => i.label.includes(filterInput));

    const selectItem = () => {

        setFilterInput(hoveredAutocompleteItem);
        props.onChange(hoveredAutocompleteItem);
    }

    const handleKey: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
        if (event.key == 'Tab' || event.key == 'Enter') {
            // perform "tab"
            event.preventDefault();
        }

        if (event.key == 'ArrowDown') {
            event.preventDefault();
        }

        if (event.key == 'ArrowUp') {
            event.preventDefault();
        }
    }

    return (
        <Popover>
            <PopoverTrigger>
                <HStack>
                    <Editable>
                        <EditablePreview />
                        <EditableInput placeholder={props.placeholder} onKeyDown={handleKey} onChange={(event) => setFilterInput(event.target.value)} value={filterInput} />
                    </Editable>
                    <Text>{completedText}</Text>
                </HStack>
            </PopoverTrigger>
            <PopoverContent>
                <VStack maxHeight={500}>
                    {filteredItems.map(item => {
                        return <AutocompleteOption item={item} filterInput={filterInput} selected={item.label === hoveredAutocompleteItem} />
                    })}
                </VStack>
            </PopoverContent>
        </Popover>
    )
  }
  
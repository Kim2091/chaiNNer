import { Center, VStack } from '@chakra-ui/react';
import { memo, useCallback, useMemo, useState } from 'react';
import { Node } from 'reactflow';
import { useContext } from 'use-context-selector';
import {
    Condition,
    InputData,
    InputId,
    InputSize,
    InputValue,
    NodeData,
    NodeSchema,
    Size,
} from '../../../common/common-types';
import { checkNodeValidity } from '../../../common/nodes/checkNodeValidity';
import { DisabledStatus } from '../../../common/nodes/disabled';
import { TypeState } from '../../../common/nodes/TypeState';
import { EMPTY_ARRAY, EMPTY_MAP, EMPTY_OBJECT, EMPTY_SET } from '../../../common/util';
import { BackendContext } from '../../contexts/BackendContext';
import { FakeNodeProvider } from '../../contexts/FakeExampleContext';
import { TypeInfo, testInputConditionTypeInfo } from '../../helpers/nodeState';
import { NodeBody } from '../node/NodeBody';
import { NodeFooter } from '../node/NodeFooter/NodeFooter';
import { NodeHeader } from '../node/NodeHeader';

// eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions, func-names
const useStateForSchema = function <T>(
    schema: NodeSchema,
    defaultValue: T
): [T, (value: (prev: T) => T) => void] {
    const [state, setState] = useState<{ value: T; schema: NodeSchema }>({
        value: defaultValue,
        schema,
    });

    const setValue = useCallback(
        (value: (prev: T) => T): void => {
            setState((prev) => {
                return {
                    value: value(prev.schema === schema ? prev.value : defaultValue),
                    schema,
                };
            });
        },
        [schema, defaultValue]
    );

    const value = state.schema === schema ? state.value : defaultValue;

    return [value, setValue];
};

interface NodeExampleProps {
    accentColor: string;
    selectedSchema: NodeSchema;
}
export const NodeExample = memo(({ accentColor, selectedSchema }: NodeExampleProps) => {
    const { schemata, functionDefinitions } = useContext(BackendContext);

    const defaultInput = useMemo<InputData>(() => {
        return schemata.getDefaultInput(selectedSchema.schemaId);
    }, [schemata, selectedSchema]);

    const [inputData, setInputData] = useStateForSchema<InputData>(selectedSchema, defaultInput);
    const setInputValue = useCallback(
        (inputId: InputId, value: InputValue): void => {
            setInputData((prev) => ({ ...prev, [inputId]: value }));
        },
        [setInputData]
    );

    const [inputSize, setInputSize] = useStateForSchema<InputSize>(selectedSchema, EMPTY_OBJECT);
    const setSingleInputSize = useCallback(
        (inputId: InputId, size: Readonly<Size>): void => {
            setInputSize((prev) => ({ ...prev, [inputId]: size }));
        },
        [setInputSize]
    );

    const nodeIdPrefix = 'FakeId ';
    const suffixLength = 36 - nodeIdPrefix.length;
    const nodeId =
        nodeIdPrefix + selectedSchema.schemaId.slice(-suffixLength).padStart(suffixLength, ' ');
    if (nodeId.length !== 36) throw new Error('Fake node ID must have the length of a real one.');

    const typeState = useMemo(() => {
        const node: Node<NodeData> = {
            id: nodeId,
            position: { x: 0, y: 0 },
            data: {
                id: nodeId,
                schemaId: selectedSchema.schemaId,
                inputData,
            },
        };
        return TypeState.create(
            new Map([[nodeId, node]]),
            EMPTY_ARRAY,
            EMPTY_MAP,
            functionDefinitions
        );
    }, [nodeId, selectedSchema, inputData, functionDefinitions]);

    const typeInfo: TypeInfo = {
        instance: typeState.functions.get(nodeId),
        connectedInputs: EMPTY_SET,
    };

    const requiredGenericInputs = new Set(
        selectedSchema.inputs.filter((i) => !i.optional && i.kind === 'generic').map((i) => i.id)
    );
    const validity = checkNodeValidity({
        schema: selectedSchema,
        connectedInputs: requiredGenericInputs,
        inputData,
        functionInstance: typeInfo.instance,
    });

    return (
        <Center key={selectedSchema.schemaId}>
            <FakeNodeProvider isFake>
                <Center
                    bg="var(--node-bg-color)"
                    borderColor="var(--node-border-color)"
                    borderRadius="lg"
                    borderWidth="0.5px"
                    boxShadow="lg"
                    minWidth="240px"
                    overflow="hidden"
                    transition="0.15s ease-in-out"
                >
                    <VStack
                        spacing={0}
                        w="full"
                    >
                        <VStack
                            spacing={0}
                            w="full"
                        >
                            <NodeHeader
                                accentColor={accentColor}
                                disabledStatus={DisabledStatus.Enabled}
                                icon={selectedSchema.icon}
                                name={selectedSchema.name}
                                parentNode={undefined}
                                selected={false}
                            />
                            <NodeBody
                                animated={false}
                                nodeState={{
                                    id: nodeId,
                                    schemaId: selectedSchema.schemaId,
                                    schema: selectedSchema,
                                    inputData,
                                    setInputValue,
                                    inputSize,
                                    setInputSize: setSingleInputSize,
                                    isLocked: false,
                                    connectedInputs: EMPTY_SET,
                                    connectedOutputs: EMPTY_SET,
                                    type: typeInfo,
                                    testCondition: (condition: Condition): boolean =>
                                        testInputConditionTypeInfo(condition, inputData, typeInfo),
                                }}
                            />
                        </VStack>
                        <NodeFooter
                            animated={false}
                            id={nodeId}
                            validity={validity}
                        />
                    </VStack>
                </Center>
            </FakeNodeProvider>
        </Center>
    );
});

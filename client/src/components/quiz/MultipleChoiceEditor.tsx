import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface MultipleChoiceEditorProps {
  options: string[];
  setOptions: React.Dispatch<React.SetStateAction<string[]>>;
  correctOption: number;
  setCorrectOption: React.Dispatch<React.SetStateAction<number>>;
}

const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
  options,
  setOptions,
  correctOption,
  setCorrectOption,
}) => {
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  return (
    <div id="multiple-choice-options">
      <div className="mb-4">
        <Label className="block text-sm font-medium mb-1">Options</Label>
        <RadioGroup
          value={correctOption.toString()}
          onValueChange={(val) => setCorrectOption(parseInt(val))}
          className="space-y-2"
        >
          {options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={index.toString()} id={`option-${index}`} />
              <Input
                type="text"
                className="input-field"
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
              />
            </div>
          ))}
        </RadioGroup>
      </div>
      
      {options.length < 8 && (
        <Button
          type="button"
          variant="link"
          className="text-sm text-primary hover:text-[#E76F51] font-medium p-0"
          onClick={handleAddOption}
        >
          + Add Another Option
        </Button>
      )}
    </div>
  );
};

export default MultipleChoiceEditor;

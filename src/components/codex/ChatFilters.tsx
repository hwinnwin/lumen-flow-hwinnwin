import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { chakraCategories, priorityColors, type ChakraCategory, type Priority } from "@/lib/chakraSystem";

interface ChatFiltersProps {
  searchQuery: string;
  selectedChakra: ChakraCategory | null;
  selectedPriority: Priority | null;
  showStarred: boolean;
  onSearchChange: (query: string) => void;
  onChakraSelect: (chakra: ChakraCategory | null) => void;
  onPrioritySelect: (priority: Priority | null) => void;
  onToggleStarred: () => void;
  onClearFilters: () => void;
}

export function ChatFilters({
  searchQuery,
  selectedChakra,
  selectedPriority,
  showStarred,
  onSearchChange,
  onChakraSelect,
  onPrioritySelect,
  onToggleStarred,
  onClearFilters
}: ChatFiltersProps) {
  const hasActiveFilters = searchQuery || selectedChakra || selectedPriority || showStarred;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Chakra Categories */}
      <div>
        <h3 className="text-sm font-medium mb-2">Chakra Categories</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(chakraCategories).map(([key, { color, label }]) => (
            <Badge
              key={key}
              variant={selectedChakra === key ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              style={selectedChakra === key ? { 
                backgroundColor: color,
                borderColor: color,
                color: 'white'
              } : {
                borderColor: color,
                color: color
              }}
              onClick={() => onChakraSelect(selectedChakra === key ? null : key as ChakraCategory)}
            >
              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: color }} />
              {label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <h3 className="text-sm font-medium mb-2">Priority</h3>
        <div className="flex gap-2">
          {Object.entries(priorityColors).map(([key, color]) => (
            <Badge
              key={key}
              variant={selectedPriority === key ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105 capitalize"
              style={selectedPriority === key ? {
                backgroundColor: color,
                borderColor: color,
                color: 'white'
              } : {
                borderColor: color,
                color: color
              }}
              onClick={() => onPrioritySelect(selectedPriority === key ? null : key as Priority)}
            >
              {key}
            </Badge>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant={showStarred ? "default" : "outline"}
          size="sm"
          onClick={onToggleStarred}
        >
          Starred Only
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}

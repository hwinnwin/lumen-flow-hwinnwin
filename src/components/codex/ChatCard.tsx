import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Edit, Trash2, ExternalLink } from "lucide-react";
import { chakraCategories, priorityColors, type ChakraCategory, type Priority } from "@/lib/chakraSystem";
import { format } from "date-fns";

interface ChatCardProps {
  id: string;
  title: string;
  content: string;
  chatDate: string;
  chakraCategory: ChakraCategory;
  priority?: Priority;
  status?: string;
  tags?: string[];
  starred?: boolean;
  onToggleStar: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}

export function ChatCard({
  id,
  title,
  content,
  chatDate,
  chakraCategory,
  priority,
  status,
  tags = [],
  starred = false,
  onToggleStar,
  onEdit,
  onDelete,
  onClick
}: ChatCardProps) {
  const chakra = chakraCategories[chakraCategory];
  const priorityColor = priority ? priorityColors[priority] : undefined;

  return (
    <Card 
      className="p-4 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
      style={{ borderLeft: `4px solid ${chakra.color}` }}
    >
      {/* Chakra glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(circle at top left, ${chakra.color}, transparent 70%)` }}
      />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1" onClick={() => onClick(id)}>
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full shadow-sm" 
                style={{ backgroundColor: chakra.color }}
              />
              <h3 className="font-semibold text-lg line-clamp-1">{title}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{chakra.label}</p>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(id);
              }}
            >
              <Star className={`h-4 w-4 ${starred ? 'fill-accent text-accent' : ''}`} />
            </Button>
          </div>
        </div>

        <div onClick={() => onClick(id)}>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {content.substring(0, 200)}...
          </p>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {priority && (
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ 
                    borderColor: priorityColor,
                    color: priorityColor
                  }}
                >
                  {priority}
                </Badge>
              )}
              
              {status && (
                <Badge variant="secondary" className="text-xs">
                  {status}
                </Badge>
              )}
              
              {tags.slice(0, 2).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              
              {tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 2}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(id);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {format(new Date(chatDate), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
    </Card>
  );
}

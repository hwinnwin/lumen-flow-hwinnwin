import { useState } from "react";
import { BookOpen, Search, Filter, Plus, Star, Copy, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mockFrameworks = [
  {
    id: 1,
    title: "Getting Things Done (GTD)",
    description: "A time management method and productivity system that helps organize tasks and commitments. Focus on capturing everything, clarifying what it means, organizing by context, and reviewing regularly.",
    category: "Productivity",
    tags: ["productivity", "time-management", "organization"],
    rating: 4.8,
    author: "David Allen",
    source: "Book",
    isFavorite: true,
    content: `Core principles:
    1. Capture everything in a trusted external system
    2. Clarify what each item means and what action is required
    3. Organize reminders by context
    4. Review the system regularly
    5. Engage with confidence in your choices`
  },
  {
    id: 2,
    title: "OKRs (Objectives and Key Results)",
    description: "Goal-setting framework used by Google, Intel, and many other organizations. Sets ambitious objectives with measurable key results to track progress.",
    category: "Strategy",
    tags: ["goal-setting", "strategy", "measurement", "alignment"],
    rating: 4.6,
    author: "Andy Grove",
    source: "Intel/Google",
    isFavorite: false,
    content: `Structure:
    - Objectives: What you want to achieve (qualitative)
    - Key Results: How you measure progress (quantitative)
    - Typically 3-5 OKRs per quarter
    - Should be ambitious but achievable`
  },
  {
    id: 3,
    title: "Design Thinking Process",
    description: "Human-centered approach to innovation that integrates the needs of people, possibilities of technology, and requirements for business success.",
    category: "Innovation",
    tags: ["design", "innovation", "human-centered", "problem-solving"],
    rating: 4.5,
    author: "IDEO",
    source: "Design Firm",
    isFavorite: true,
    content: `Five stages:
    1. Empathize - Understand the user
    2. Define - Frame the problem
    3. Ideate - Generate solutions
    4. Prototype - Build to think
    5. Test - Learn from users`
  },
  {
    id: 4,
    title: "Eisenhower Matrix",
    description: "Decision-making framework that helps prioritize tasks by urgency and importance, dividing them into four quadrants for effective time management.",
    category: "Decision Making",
    tags: ["prioritization", "time-management", "decision-making"],
    rating: 4.3,
    author: "Dwight D. Eisenhower",
    source: "Presidential Strategy",
    isFavorite: false,
    content: `Four quadrants:
    1. Urgent + Important: Do first
    2. Not Urgent + Important: Schedule
    3. Urgent + Not Important: Delegate
    4. Not Urgent + Not Important: Eliminate`
  }
];

const categories = ["All", "Productivity", "Strategy", "Innovation", "Decision Making"];

export default function Codex() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [frameworks, setFrameworks] = useState(mockFrameworks);

  const filteredFrameworks = frameworks.filter(framework => {
    const matchesSearch = framework.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         framework.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         framework.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || framework.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id: number) => {
    setFrameworks(frameworks.map(f => 
      f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-royal bg-clip-text text-transparent">
            Codex
          </h1>
          <p className="text-muted-foreground mt-1">
            Your collection of frameworks, methodologies, and philosophies
          </p>
        </div>
        <Button className="bg-gradient-primary text-primary-foreground shadow-royal">
          <Plus className="w-4 h-4 mr-2" />
          Add Framework
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search frameworks, tags, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>
        
        <div className="flex gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? "bg-gradient-primary text-primary-foreground" : ""}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{frameworks.length}</p>
                <p className="text-sm text-muted-foreground">Total Frameworks</p>
              </div>
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {frameworks.filter(f => f.isFavorite).length}
                </p>
                <p className="text-sm text-muted-foreground">Favorites</p>
              </div>
              <Star className="w-6 h-6 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{categories.length - 1}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
              <Filter className="w-6 h-6 text-primary-glow" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(frameworks.reduce((acc, f) => acc + f.rating, 0) / frameworks.length * 10) / 10}
                </p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-primary-glow/20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-primary-glow" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Frameworks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredFrameworks.map((framework) => (
          <Card key={framework.id} className="bg-card border-border shadow-card hover:shadow-glow transition-royal">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{framework.category}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="w-4 h-4 text-accent" />
                      {framework.rating}
                    </div>
                  </div>
                  <CardTitle className="text-xl text-foreground mb-2">
                    {framework.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    by {framework.author} • {framework.source}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFavorite(framework.id)}
                  className="p-2"
                >
                  <Star 
                    className={`w-4 h-4 ${
                      framework.isFavorite ? 'fill-accent text-accent' : 'text-muted-foreground'
                    }`} 
                  />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                {framework.description}
              </p>
              
              <div className="mb-4 p-4 rounded-lg bg-muted border border-border">
                <p className="text-sm text-foreground whitespace-pre-line">
                  {framework.content}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-4">
                {framework.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFrameworks.length === 0 && (
        <Card className="bg-card border-border shadow-card">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No frameworks found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { Moon, Sun, Download, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
  isConnected: boolean;
}

export const Header = ({ isConnected }: HeaderProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">
            Backend Metrics Visualizer
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Backend Status */}
          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
            <Circle
              className={`h-2.5 w-2.5 fill-current ${
                isConnected ? 'text-success' : 'text-destructive'
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>

          {/* Export Button */}
          <Button variant="outline" size="sm" className="hidden gap-2 sm:flex">
            <Download className="h-4 w-4" />
            Export
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

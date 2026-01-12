'use client';
import { useContext } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings } from 'lucide-react';
import { CHESS_THEMES } from '@/lib/chess-themes';
import { ThemeContext } from '@/context/theme-context';

export function ThemeSelector() {
  const { theme, setTheme } = useContext(ThemeContext);

  const handleThemeChange = (themeId: string) => {
    const selectedTheme = CHESS_THEMES.find((t) => t.id === themeId);
    if (selectedTheme) {
      setTheme(selectedTheme);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Board Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme.id}
          onValueChange={handleThemeChange}
        >
          {CHESS_THEMES.map((themeOption) => (
            <DropdownMenuRadioItem key={themeOption.id} value={themeOption.id}>
              {themeOption.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Check } from 'lucide-react';
import { useTranslation, Language } from '@/contexts/LanguageContext';

const languages = [
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
  { code: 'sw' as Language, name: 'Kiswahili', flag: '🇰🇪' },
];

export const LanguageSelector = () => {
  const { language, setLanguage, t } = useTranslation();

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Languages className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLanguage?.flag}</span>
          <span className="hidden md:inline">{currentLanguage?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="gap-2 cursor-pointer"
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
            {language === lang.code && <Check className="w-4 h-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
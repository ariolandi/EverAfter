import { useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { Menu } from '../../shared/types';
import { MENU_COURSES } from '../events/menuCourses';

interface MenusPageProps {
  menus: Menu[];
  /** Colour of the text; the menu names stand out in `accentColor`. */
  textColor: string;
  accentColor: string;
}


/** A length that shrinks along with the page's text. */
const scaled = (rem: number) => `calc(${rem}rem * var(--menu-scale, 1))`;

/**
 * The invitation's menus page: every menu of the event with its dishes, course by course.
 * The text shrinks until everything fits on the plaque without scrolling.
 */
export default function MenusPage({ menus, textColor, accentColor }: MenusPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <Stack ref={rootRef} sx={{ alignItems: 'center', color: textColor, gap: scaled(1) }}>
      <Typography variant="metallic" component="h3" align="center" sx={{ fontSize: scaled(2), lineHeight: 1.2 }}>
        Менюта
      </Typography>
      {/* Two columns, so more menus fit before the text has to shrink. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          width: '100%',
          // Gold lines set the menus apart: one between the columns, one above each later row. Both stop short of
          // the cell's edges, so they never touch or cross.
          '& > *': {
            position: 'relative',
            px: scaled(1),
            py: scaled(1.25),
            '&::before, &::after': { content: '""', position: 'absolute', bgcolor: 'primary.main' },
          },
          '& > :nth-of-type(odd)::after': { right: 0, top: '18%', bottom: '18%', width: '1px' },
          '& > :nth-of-type(n + 3)::before': { top: 0, left: '18%', right: '18%', height: '1px' },
          // A last menu left on its own sits in the middle, with no column line beside it.
          '& > :last-child:nth-of-type(odd)': { gridColumn: '1 / -1' },
          '& > :last-child:nth-of-type(odd)::after': { display: 'none' },
        }}
      >
        {menus.map((menu) => (
          <Stack key={menu.id} sx={{ alignItems: 'center', gap: scaled(0.5), minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
              <Typography
                component="h4"
                sx={{ color: accentColor, fontStyle: 'italic', fontSize: scaled(1.05), lineHeight: 1.2 }}
              >
                {menu.name}
              </Typography>
            </Stack>
            <Box component="dl" sx={{ m: 0, textAlign: 'center' }}>
              {MENU_COURSES.map(({ key, label }) => (
                <Box key={key} sx={{ mb: scaled(0.4) }}>
                  <Typography
                    component="dt"
                    sx={{ fontSize: scaled(0.6), textTransform: 'uppercase', letterSpacing: 0.8, lineHeight: 1.3 }}
                  >
                    {label}
                  </Typography>
                  <Typography component="dd" sx={{ m: 0, fontSize: scaled(0.75), lineHeight: 1.3 }}>
                    {menu[key]}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Stack>
        ))}
      </Box>
      <Typography align="center" sx={{ fontSize: scaled(0.65), fontStyle: 'italic', opacity: 0.8 }}>
        Менютата могат да бъдат променени.
      </Typography>
    </Stack>
  );
}

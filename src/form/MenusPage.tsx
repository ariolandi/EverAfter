import { Box, Chip, Stack, Typography } from '@mui/material';
import type { Menu } from '../../shared/types';
import { MENU_COURSES } from '../events/menuCourses';
import { GoldRule } from '../components/goldRule';
import { SectionTitle } from '../components/SectionTitle';

interface MenusPageProps {
    menus: Menu[];
    /** Colour of the text; the menu names stand out in `accentColor`. */
    textColor: string;
    accentColor: string;
}

/** The invitation's menus page: every menu of the event with its dishes, course by course. */
export default function MenusPage({ menus, textColor, accentColor }: MenusPageProps) {
    return (
        <Stack spacing={2} sx={{ alignItems: 'center', color: textColor }}>
            <SectionTitle>Менюта</SectionTitle>
            {menus.map((menu, index) => (
                <Stack key={menu.id} spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
                    {index > 0 && <GoldRule />}
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography component="h4" sx={{ color: accentColor, fontStyle: 'italic', fontSize: '1.25rem' }}>
                            {menu.name}
                        </Typography>
                        {menu.isChild && <Chip size="small" variant="outlined" label="Детско" />}
                    </Stack>
                    <Box component="dl" sx={{ m: 0, textAlign: 'center' }}>
                        {MENU_COURSES.map(({ key, label }) => (
                            <Box key={key} sx={{ mb: 0.75 }}>
                                <Typography component="dt" variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {label}
                                </Typography>
                                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                                    {menu[key]}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Stack>
            ))}
        </Stack>
    );
}

import { Box, Typography } from '@mui/material';
import AppLayout from '@/components/layout/AppLayout';

export default function SettingsPage() {
	return (
		<AppLayout>
			<Box sx={{ p: { xs: 2, md: 3 } }}>
				<Typography variant="h4" sx={{ fontWeight: 700 }}>
					Settings
				</Typography>
			</Box>
		</AppLayout>
	);
}

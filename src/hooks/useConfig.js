import { useEffect, useState } from 'react';
import { getSystemConfig } from '@/services/config.service';
import logger from '@/utils/logger';

const DEFAULT_CONFIG = {
	revenueTarget: 50000,
};

const useConfig = () => {
	const [config, setConfig] = useState(DEFAULT_CONFIG);

	useEffect(() => {
		let active = true;

		const load = async () => {
			try {
				const data = await getSystemConfig();
				if (!active) return;
				setConfig({ ...DEFAULT_CONFIG, ...(data || {}) });
			} catch (err) {
				logger.warn('Failed to load config, using defaults:', err);
			}
		};

		load();
		return () => {
			active = false;
		};
	}, []);

	return config;
};

export default useConfig;

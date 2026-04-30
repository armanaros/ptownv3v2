const PREFIX = 'ptown:ratelimit:';

const now = () => Date.now();

export const checkRateLimit = (key, maxAttempts = 5, windowMs = 60_000) => {
	const storageKey = `${PREFIX}${key}`;
	const raw = localStorage.getItem(storageKey);
	const timestamps = raw ? JSON.parse(raw) : [];
	const cutoff = now() - windowMs;
	const valid = timestamps.filter((ts) => ts >= cutoff);

	const allowed = valid.length < maxAttempts;
	if (allowed) {
		valid.push(now());
		localStorage.setItem(storageKey, JSON.stringify(valid));
	}

	return {
		allowed,
		remaining: Math.max(0, maxAttempts - valid.length),
		retryAfterMs: allowed || valid.length === 0 ? 0 : Math.max(0, windowMs - (now() - valid[0])),
	};
};

export const resetRateLimit = (key) => {
	localStorage.removeItem(`${PREFIX}${key}`);
};

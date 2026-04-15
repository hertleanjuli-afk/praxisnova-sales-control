type Meta = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', msg: string, meta?: Meta) {
  const payload = JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    ...(meta ?? {}),
  });
  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.log(payload);
}

export const logger = {
  info: (msg: string, meta?: Meta) => emit('info', msg, meta),
  warn: (msg: string, meta?: Meta) => emit('warn', msg, meta),
  error: (msg: string, meta?: Meta) => emit('error', msg, meta),
};

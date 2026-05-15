import Handlebars from 'handlebars';

export function registerHelpers() {
  Handlebars.registerHelper('format', (value: unknown, pattern?: unknown) => {
    const num = Number(value);
    if (isNaN(num)) return value;
    if (typeof pattern === 'string') {
      const decimals = (pattern.match(/\.(\d+)/) ?? [])[1]?.length ?? 0;
      return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    return num.toLocaleString('pt-BR');
  });

  Handlebars.registerHelper('currency', (value: unknown, locale?: unknown, currencyCode?: unknown) => {
    const num = Number(value);
    const loc = typeof locale === 'string' ? locale : 'pt-BR';
    const cur = typeof currencyCode === 'string' ? currencyCode : 'BRL';
    if (isNaN(num)) return value;
    return num.toLocaleString(loc, { style: 'currency', currency: cur });
  });

  Handlebars.registerHelper('date', (value: unknown, fmt?: unknown) => {
    const d = new Date(value as string | number);
    if (isNaN(d.getTime())) return value;
    if (typeof fmt !== 'string') return d.toLocaleDateString('pt-BR');
    return fmt
      .replace('yyyy', String(d.getFullYear()))
      .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
      .replace('dd', String(d.getDate()).padStart(2, '0'))
      .replace('HH', String(d.getHours()).padStart(2, '0'))
      .replace('mm', String(d.getMinutes()).padStart(2, '0'))
      .replace('ss', String(d.getSeconds()).padStart(2, '0'));
  });

  Handlebars.registerHelper('uppercase', (v: unknown) => String(v ?? '').toUpperCase());
  Handlebars.registerHelper('lowercase', (v: unknown) => String(v ?? '').toLowerCase());
  Handlebars.registerHelper('capitalize', (v: unknown) => {
    const s = String(v ?? '');
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  });

  Handlebars.registerHelper('add', (a: unknown, b: unknown) => Number(a) + Number(b));
  Handlebars.registerHelper('sub', (a: unknown, b: unknown) => Number(a) - Number(b));
  Handlebars.registerHelper('mul', (a: unknown, b: unknown) => Number(a) * Number(b));
  Handlebars.registerHelper('div', (a: unknown, b: unknown) => Number(a) / Number(b));

  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
  Handlebars.registerHelper('gt', (a: unknown, b: unknown) => Number(a) > Number(b));
  Handlebars.registerHelper('lt', (a: unknown, b: unknown) => Number(a) < Number(b));
  Handlebars.registerHelper('gte', (a: unknown, b: unknown) => Number(a) >= Number(b));
  Handlebars.registerHelper('lte', (a: unknown, b: unknown) => Number(a) <= Number(b));
  Handlebars.registerHelper('and', (a: unknown, b: unknown) => Boolean(a) && Boolean(b));
  Handlebars.registerHelper('or', (a: unknown, b: unknown) => Boolean(a) || Boolean(b));

  Handlebars.registerHelper('length', (arr: unknown) => Array.isArray(arr) ? arr.length : 0);
  Handlebars.registerHelper('sum', (arr: unknown, key?: unknown) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((acc: number, item: unknown) =>
      acc + Number(typeof key === 'string' ? (item as Record<string, unknown>)[key] : item), 0);
  });
}

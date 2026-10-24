// The condition language: what a scene, a thread, an ambition or a choice asks
// of a life before it is offered. A tiny expression grammar with a real parser
// (an AST, errors with positions) and an evaluator that reads a plain scope
// object. Pure and dependency-free, so it can move into dist/js/ unchanged
// when the engine starts reading content.
//
//   expr    := or
//   or      := and ('or' and)*
//   and     := not ('and' not)*
//   not     := 'not' not | cmp
//   cmp     := primary (('==' | '!=' | '<' | '<=' | '>' | '>=') primary)?
//   primary := number | 'string' | true | false | call | path | '(' expr ')'
//   call    := name '(' (expr (',' expr)*)? ')'
//   path    := name ('.' name)*
//
// Examples: `age >= 16 and season == 'spring'`, `has(nature, 'brave')`,
// `not mark('drinker') or gold < 20`, `in(season, 'spring', 'summer')`,
// `credential('letters') and standing.villagers > 10`.

export class ConditionError extends Error {
  constructor(message, position, source = '') {
    super(position === undefined ? message : `${message} at ${position}`);
    this.name = 'ConditionError';
    this.position = position;
    this.source = source;
  }
}

const COMPARATORS = ['==', '!=', '<=', '>=', '<', '>'];
const KEYWORDS = new Set(['and', 'or', 'not', 'true', 'false']);
const isNameStart = c => /[A-Za-z_]/.test(c);
const isNameChar = c => /[A-Za-z0-9_]/.test(c);
const isDigit = c => c >= '0' && c <= '9';

/** Split the source into tokens, each carrying its position in the source. */
export function tokenize(source) {
  if (typeof source !== 'string') throw new ConditionError('A condition is a string', 0, String(source));
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    const start = i;
    if (c === '(' || c === ')' || c === ',' || c === '.') { tokens.push({ type: c, value: c, position: start }); i++; continue; }
    const two = source.slice(i, i + 2);
    if (COMPARATORS.includes(two)) { tokens.push({ type: 'op', value: two, position: start }); i += 2; continue; }
    if (c === '<' || c === '>') { tokens.push({ type: 'op', value: c, position: start }); i++; continue; }
    if (c === '=' || c === '!') throw new ConditionError(`Expected '${c}='`, start, source);
    if (c === "'") {
      let j = i + 1, text = '';
      while (j < source.length && source[j] !== "'") { text += source[j]; j++; }
      if (j >= source.length) throw new ConditionError('Unterminated string', start, source);
      tokens.push({ type: 'str', value: text, position: start }); i = j + 1; continue;
    }
    if (c === '"') throw new ConditionError('Strings use single quotes', start, source);
    if (isDigit(c) || (c === '-' && isDigit(source[i + 1] || ''))) {
      let j = i + 1, dot = false;
      while (j < source.length && (isDigit(source[j]) || (source[j] === '.' && !dot && isDigit(source[j + 1] || '')))) { if (source[j] === '.') dot = true; j++; }
      tokens.push({ type: 'num', value: Number(source.slice(i, j)), position: start }); i = j; continue;
    }
    if (isNameStart(c)) {
      let j = i + 1;
      while (j < source.length && isNameChar(source[j])) j++;
      const word = source.slice(i, j);
      tokens.push({ type: KEYWORDS.has(word) ? 'kw' : 'name', value: word, position: start }); i = j; continue;
    }
    throw new ConditionError(`Unexpected character '${c}'`, start, source);
  }
  tokens.push({ type: 'end', value: null, position: source.length });
  return tokens;
}

/** Parse a condition into an AST. Throws ConditionError with the position of the first fault. */
export function parse(source) {
  const tokens = tokenize(source);
  let at = 0;
  const peek = () => tokens[at];
  const next = () => tokens[at++];
  const is = (type, value) => peek().type === type && (value === undefined || peek().value === value);
  const expect = (type, value, what) => {
    if (is(type, value)) return next();
    const t = peek();
    throw new ConditionError(`Expected ${what || value || type} but found ${t.type === 'end' ? 'the end' : `'${t.value}'`}`, t.position, source);
  };
  const or = () => {
    let left = and();
    while (is('kw', 'or')) { next(); left = { type: 'or', left, right: and() }; }
    return left;
  };
  const and = () => {
    let left = not();
    while (is('kw', 'and')) { next(); left = { type: 'and', left, right: not() }; }
    return left;
  };
  const not = () => {
    if (is('kw', 'not')) { next(); return { type: 'not', arg: not() }; }
    return cmp();
  };
  const cmp = () => {
    const left = primary();
    if (is('op')) { const op = next().value; return { type: 'cmp', op, left, right: primary() }; }
    return left;
  };
  const primary = () => {
    const t = peek();
    if (t.type === 'num') { next(); return { type: 'num', value: t.value }; }
    if (t.type === 'str') { next(); return { type: 'str', value: t.value }; }
    if (t.type === 'kw' && (t.value === 'true' || t.value === 'false')) { next(); return { type: 'bool', value: t.value === 'true' }; }
    if (t.type === '(') {
      next();
      const inner = or();
      expect(')', undefined, "')'");
      return inner;
    }
    if (t.type === 'name') {
      next();
      if (is('(')) {
        next();
        const args = [];
        if (!is(')')) { args.push(or()); while (is(',')) { next(); args.push(or()); } }
        expect(')', undefined, "')'");
        return { type: 'call', name: t.value, args, position: t.position };
      }
      const path = [t.value];
      while (is('.')) { next(); path.push(expect('name', undefined, 'a name after the dot').value); }
      return { type: 'path', path, position: t.position };
    }
    if (t.type === 'kw') throw new ConditionError(`Unexpected '${t.value}'`, t.position, source);
    if (t.type === 'end') throw new ConditionError('Unexpected end of condition', t.position, source);
    throw new ConditionError(`Unexpected '${t.value}'`, t.position, source);
  };
  if (is('end')) throw new ConditionError('Empty condition', 0, source);
  const ast = or();
  if (!is('end')) { const t = peek(); throw new ConditionError(`Unexpected '${t.value}'`, t.position, source); }
  return ast;
}

/** Parse without throwing: `{ ok: true, ast }` or `{ ok: false, error: { message, position } }`. */
export function tryParse(source) {
  try { return { ok: true, ast: parse(source) }; }
  catch (e) {
    if (e instanceof ConditionError) return { ok: false, error: { message: e.message.replace(/ at \d+$/, ''), position: e.position } };
    throw e;
  }
}

const resolvePath = (scope, path) => {
  let v = scope;
  for (const key of path) {
    if (v === null || v === undefined) return undefined;
    if (typeof v !== 'object' && typeof v !== 'function') return undefined;
    v = v[key];
  }
  return v;
};
const member = (list, value) => Array.isArray(list) ? list.includes(value) : list && typeof list === 'object' ? !!list[value] : false;

/** The functions a condition may call. Each reads the evaluated arguments and the scope. */
export const FUNCTIONS = Object.freeze({
  // has(list, value): membership in a list or a truthy key of an object, e.g. has(nature, 'brave').
  has: (scope, [list, value]) => member(list, value),
  // in(value, a, b, …): value is one of the options, e.g. in(season, 'spring', 'summer').
  in: (scope, [value, ...options]) => options.includes(value),
  // mark(id): life wrote this on the hero (scope.marks).
  mark: (scope, [id]) => member(scope.marks, id),
  // flag(id): a story flag is set (scope.flags).
  flag: (scope, [id]) => !!(scope.flags && scope.flags[id]),
  // knows(roleKind): someone of that kind is in the life (scope.knows).
  knows: (scope, [kind]) => member(scope.knows, kind),
  // credential(kind): a credential earned (scope.credentials).
  credential: (scope, [kind]) => member(scope.credentials, kind),
});

const compare = (op, a, b) => {
  switch (op) {
    case '==': return a === b || (typeof a === 'number' && typeof b === 'number' && a === b);
    case '!=': return !compare('==', a, b);
    case '<': return typeof a === 'number' && typeof b === 'number' && a < b;
    case '<=': return typeof a === 'number' && typeof b === 'number' && a <= b;
    case '>': return typeof a === 'number' && typeof b === 'number' && a > b;
    case '>=': return typeof a === 'number' && typeof b === 'number' && a >= b;
    default: throw new ConditionError(`Unknown comparator ${op}`);
  }
};

/** Evaluate an AST against a scope. `functions` may add to or override FUNCTIONS. Returns a boolean for a condition, or the value of a bare expression. */
export function evaluate(ast, scope = {}, functions = {}) {
  const fns = { ...FUNCTIONS, ...functions };
  const walk = node => {
    switch (node.type) {
      case 'num': case 'str': case 'bool': return node.value;
      case 'path': return resolvePath(scope, node.path);
      case 'call': {
        const fn = fns[node.name];
        if (!fn) throw new ConditionError(`Unknown function ${node.name}`, node.position);
        return fn(scope, node.args.map(walk));
      }
      case 'cmp': return compare(node.op, walk(node.left), walk(node.right));
      case 'and': return !!walk(node.left) && !!walk(node.right);
      case 'or': return !!walk(node.left) || !!walk(node.right);
      case 'not': return !walk(node.arg);
      default: throw new ConditionError(`Unknown node ${node.type}`);
    }
  };
  return walk(ast);
}

/** Parse and evaluate in one step; `holds('age >= 16', scope)`. */
export function holds(source, scope, functions) { return !!evaluate(parse(source), scope, functions); }

/** Every path and call an AST uses, for a validator that checks them against a known scope. */
export function references(ast) {
  const paths = [], calls = [];
  const walk = node => {
    switch (node.type) {
      case 'path': paths.push({ path: node.path, position: node.position }); break;
      case 'call': calls.push({ name: node.name, args: node.args, position: node.position }); node.args.forEach(walk); break;
      case 'cmp': case 'and': case 'or': walk(node.left); walk(node.right); break;
      case 'not': walk(node.arg); break;
      default: break;
    }
  };
  walk(ast);
  return { paths, calls };
}

/** Every comparison in an AST, so a validator can check a literal against the path it is compared with. */
export function comparisons(ast) {
  const rows = [];
  const walk = node => {
    switch (node.type) {
      case 'cmp': rows.push(node); walk(node.left); walk(node.right); break;
      case 'and': case 'or': walk(node.left); walk(node.right); break;
      case 'not': walk(node.arg); break;
      case 'call': node.args.forEach(walk); break;
      default: break;
    }
  };
  walk(ast);
  return rows;
}

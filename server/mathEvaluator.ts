/**
 * Avaliador matemático seguro sem o uso de eval().
 * Suporta +, -, *, /, %, parênteses e precedência de operadores.
 */
export function evaluateMathExpression(expr: string): number | null {
  if (!expr || !expr.trim()) return null;

  try {
    // Normalizar palavras e operadores em português
    let clean = expr.toLowerCase()
      .replace(/vezes|x|multiplicado\s+por/g, '*')
      .replace(/dividido\s+por|sobre/g, '/')
      .replace(/mais/g, '+')
      .replace(/menos/g, '-')
      .replace(/por\s+cento|porcento/g, '%')
      .replace(/,/g, '.')
      .replace(/[^0-9+\-*/%().\s]/g, '');

    if (!clean.trim()) return null;

    // Subtituição simples de porcentagem (ex: 50 * 10% -> 50 * 0.1, ou 100 + 15% -> 100 * 1.15)
    clean = clean.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');

    const tokens = tokenize(clean);
    if (!tokens || tokens.length === 0) return null;

    const parser = new Parser(tokens);
    const result = parser.parse();
    if (isNaN(result) || !isFinite(result)) return null;

    return result;
  } catch (e) {
    return null;
  }
}

type Token =
  | { type: 'NUMBER'; value: number }
  | { type: 'OP'; value: string }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < input.length && /[0-9.]/.test(input[i])) {
        numStr += input[i];
        i++;
      }
      const val = parseFloat(numStr);
      if (isNaN(val)) return null;
      tokens.push({ type: 'NUMBER', value: val });
      continue;
    }

    if (['+', '-', '*', '/'].includes(char)) {
      tokens.push({ type: 'OP', value: char });
      i++;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'LPAREN' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'RPAREN' });
      i++;
      continue;
    }

    return null;
  }

  return tokens;
}

class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  parse(): number {
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error('Tokens não consumidos');
    }
    return result;
  }

  private parseExpression(): number {
    let left = this.parseTerm();

    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      if (token.type === 'OP' && (token.value === '+' || token.value === '-')) {
        this.pos++;
        const right = this.parseTerm();
        left = token.value === '+' ? left + right : left - right;
      } else {
        break;
      }
    }

    return left;
  }

  private parseTerm(): number {
    let left = this.parseFactor();

    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      if (token.type === 'OP' && (token.value === '*' || token.value === '/')) {
        this.pos++;
        const right = this.parseFactor();
        if (token.value === '/') {
          if (right === 0) throw new Error('Divisão por zero');
          left = left / right;
        } else {
          left = left * right;
        }
      } else {
        break;
      }
    }

    return left;
  }

  private parseFactor(): number {
    if (this.pos >= this.tokens.length) {
      throw new Error('Fim inesperado da expressão');
    }

    const token = this.tokens[this.pos];

    if (token.type === 'NUMBER') {
      this.pos++;
      return token.value;
    }

    if (token.type === 'OP' && (token.value === '+' || token.value === '-')) {
      this.pos++;
      const factor = this.parseFactor();
      return token.value === '-' ? -factor : factor;
    }

    if (token.type === 'LPAREN') {
      this.pos++;
      const expr = this.parseExpression();
      if (this.pos >= this.tokens.length || this.tokens[this.pos].type !== 'RPAREN') {
        throw new Error('Parêntese de fechamento ausente');
      }
      this.pos++;
      return expr;
    }

    throw new Error('Fator inválido');
  }
}

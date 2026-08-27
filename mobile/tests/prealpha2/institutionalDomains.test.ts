import {
  findInstitutionForEmail,
  institutionalDomains,
} from '../../src/data/institutionalDomains';

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const uerj =
  findInstitutionForEmail(
    '  ALGUEM@UERJ.BR  ',
  );

assert(
  uerj?.tag === 'UERJ',
  'deve normalizar maiúsculas e espaços',
);

const iq =
  findInstitutionForEmail(
    'pessoa@iq.ufrj.br',
  );

assert(
  iq?.tag === 'UFRJ · IQ',
  'deve escolher o domínio específico do IQ/UFRJ',
);

assert(
  findInstitutionForEmail(
    'sem-arroba',
  ) === null,
  'deve rejeitar e-mail sem domínio',
);

assert(
  findInstitutionForEmail(
    'x@gmail.com',
  ) === null,
  'deve rejeitar domínio fora da planilha',
);

for (
  let index = 1;
  index < institutionalDomains.length;
  index += 1
) {
  assert(
    institutionalDomains[
      index - 1
    ].domain.length >=
      institutionalDomains[
        index
      ].domain.length,
    'allowlist deve estar ordenada por domínio mais específico',
  );
}

console.log(
  `institutionalDomains OK: ${institutionalDomains.length} domínios`,
);

function utf8Length(value: string) {
  return new TextEncoder().encode(value).length;
}

function field(
  id: string,
  value: string,
) {
  const length =
    utf8Length(value)
      .toString()
      .padStart(2, '0');

  return `${id}${length}${value}`;
}

function normalizeMerchantText(
  value: string,
  maxLength: number,
) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLength) || 'ELISEO';
}

function normalizeTxid(
  value: string,
) {
  const clean = value
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 25);

  return clean || '***';
}

function crc16Ccitt(
  value: string,
) {
  const bytes =
    new TextEncoder().encode(value);

  let crc = 0xffff;

  for (
    const byte of bytes
  ) {
    crc ^= byte << 8;

    for (
      let bit = 0;
      bit < 8;
      bit++
    ) {
      crc =
        (crc & 0x8000) !== 0
          ? ((crc << 1) ^ 0x1021) & 0xffff
          : (crc << 1) & 0xffff;
    }
  }

  return crc
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');
}

export function buildPixPayload({
  pixKey,
  amountCents,
  txid,
  merchantName = 'ELISEO',
  merchantCity = 'RIO DE JANEIRO',
}: {
  pixKey: string;
  amountCents: number;
  txid: string;
  merchantName?: string;
  merchantCity?: string;
}) {
  const key =
    pixKey.trim();

  if (!key) {
    throw new Error(
      'Chave PIX inválida.',
    );
  }

  if (
    !Number.isInteger(
      amountCents,
    ) ||
    amountCents <= 0
  ) {
    throw new Error(
      'Valor PIX inválido.',
    );
  }

  const merchantAccount =
    field(
      '00',
      'br.gov.bcb.pix',
    ) +
    field(
      '01',
      key,
    );

  const amount =
    (amountCents / 100)
      .toFixed(2);

  const additionalData =
    field(
      '05',
      normalizeTxid(
        txid,
      ),
    );

  const base =
    field('00', '01') +
    field(
      '26',
      merchantAccount,
    ) +
    field('52', '0000') +
    field('53', '986') +
    field('54', amount) +
    field('58', 'BR') +
    field(
      '59',
      normalizeMerchantText(
        merchantName,
        25,
      ),
    ) +
    field(
      '60',
      normalizeMerchantText(
        merchantCity,
        15,
      ),
    ) +
    field(
      '62',
      additionalData,
    ) +
    '6304';

  return base +
    crc16Ccitt(base);
}

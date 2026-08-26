/* =========================================================
   ELÍSEO — PIX BR CODE ESTÁTICO
   Gera o payload "Pix Copia e Cola" a partir de uma chave
   Pix já cadastrada e de um valor definido.
   ========================================================= */

type BuildPixPayloadInput = {
  pixKey: string;
  amountCents: number;
  txid?: string;
};

function tlv(
  id: string,
  value: string
) {
  const length =
    String(value.length)
      .padStart(2, "0");

  return `${id}${length}${value}`;
}

function cleanTxid(
  value?: string
) {
  const clean =
    (value || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 25);

  return clean || "***";
}

function crc16Ccitt(
  payload: string
) {
  let crc = 0xffff;

  for (
    let index = 0;
    index < payload.length;
    index += 1
  ) {
    crc ^=
      payload.charCodeAt(index) << 8;

    for (
      let bit = 0;
      bit < 8;
      bit += 1
    ) {
      crc =
        (crc & 0x8000) !== 0
          ? ((crc << 1) ^ 0x1021)
          : (crc << 1);

      crc &= 0xffff;
    }
  }

  return crc
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
}

export function buildPixPayload({
  pixKey,
  amountCents,
  txid,
}: BuildPixPayloadInput) {
  const key = pixKey.trim();

  if (!key) {
    throw new Error(
      "Chave Pix não disponível."
    );
  }

  if (
    !Number.isInteger(amountCents) ||
    amountCents <= 0
  ) {
    throw new Error(
      "Valor Pix inválido."
    );
  }

  const merchantAccount =
    tlv(
      "00",
      "br.gov.bcb.pix"
    ) +
    tlv(
      "01",
      key
    );

  const additionalData =
    tlv(
      "05",
      cleanTxid(txid)
    );

  const amount =
    (amountCents / 100)
      .toFixed(2);

  const withoutCrc =
    tlv("00", "01") +
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", amount) +
    tlv("58", "BR") +
    tlv("59", "ELISEO") +
    tlv("60", "BRASIL") +
    tlv("62", additionalData) +
    "6304";

  return (
    withoutCrc +
    crc16Ccitt(withoutCrc)
  );
}

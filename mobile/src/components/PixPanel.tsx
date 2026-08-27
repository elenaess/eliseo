import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';

import {
  Check,
  CircleDollarSign,
  Copy,
  KeyRound,
  Send,
  X,
} from 'lucide-react-native';

import {
  Avatar,
} from './Avatar';

import {
  NativePressable,
} from './NativePressable';

import {
  getUserById,
} from '../services/firebase';

import type {
  EliseoUser,
} from '../services/firebase';

import {
  confirmPixPaymentReceived,
  createPixRequest,
  formatPixAmount,
  getMyPixKey,
  getPixRequestSecret,
  getServerPixMembers,
  listenToIncomingPixRequests,
  listenToOutgoingPixRequests,
  markPixPaymentReported,
  parsePixAmount,
  respondToPixRequest,
  saveMyPixKey,
} from '../services/pix';

import type {
  EliseoPixAction,
  EliseoPixRequest,
} from '../services/pix';

import {
  buildPixPayload,
} from '../services/pixPayload';

import {
  colors,
  radii,
  spacing,
} from '../theme';

import {
  useAppAppearance,
} from '../context/AppAppearanceContext';

export type PixPanelContext =
  | {
      type: 'dm';
      conversationId: string;
      target:
        EliseoUser;
    }
  | {
      type: 'server';
      serverId: string;
      channelId: string;
    };

function sameContext(
  request:
    EliseoPixRequest,
  context:
    PixPanelContext,
) {
  if (
    context.type ===
    'dm'
  ) {
    return (
      request.contextType ===
        'dm' &&
      request.conversationId ===
        context.conversationId
    );
  }

  return (
    request.contextType ===
      'server' &&
    request.serverId ===
      context.serverId &&
    request.channelId ===
      context.channelId
  );
}

function counterpartId(
  request:
    EliseoPixRequest,
  currentUid: string,
) {
  return request.initiatorId ===
    currentUid
    ? request.targetId
    : request.initiatorId;
}

function PixReadyCard({
  request,
  username,
  busy,
  onPaid,
}: {
  request:
    EliseoPixRequest;
  username: string;
  busy: boolean;
  onPaid: (
    request:
      EliseoPixRequest,
  ) => void;
}) {
  const [
    pixPayload,
    setPixPayload,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    copied,
    setCopied,
  ] =
    useState(false);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setPixPayload('');

    getPixRequestSecret(
      request.id,
    )
      .then(
        secret => {
          if (
            !alive
          ) {
            return;
          }

          if (
            !secret?.pixKey
          ) {
            setPixPayload('');
            return;
          }

          setPixPayload(
            buildPixPayload({
              pixKey:
                secret.pixKey,
              amountCents:
                request.amountCents,
              txid:
                request.id,
            }),
          );
        },
      )
      .catch(
        () => {
          if (alive) {
            setPixPayload('');
          }
        },
      )
      .finally(
        () => {
          if (alive) {
            setLoading(false);
          }
        },
      );

    return () => {
      alive = false;
    };
  }, [
    request.id,
    request.amountCents,
  ]);

  function copyPix() {
    if (!pixPayload) {
      return;
    }

    Clipboard.setString(
      pixPayload,
    );

    setCopied(true);

    setTimeout(
      () =>
        setCopied(false),
      1400,
    );
  }

  return (
    <View
      style={
        styles.readyCard
      }
    >
      <View
        style={
          styles.cardHeader
        }
      >
        <View
          style={
            styles.statusIcon
          }
        >
          <CircleDollarSign
            size={18}
            color="#42A9FF"
          />
        </View>

        <View
          style={
            styles.cardHeaderText
          }
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            PIX pronto para pagar
          </Text>

          <Text
            style={
              styles.cardSubtitle
            }
          >
            Pague{' '}
            {formatPixAmount(
              request.amountCents,
            )}{' '}
            para @{username}.
          </Text>
        </View>
      </View>

      {loading ? (
        <View
          style={
            styles.qrLoading
          }
        >
          <ActivityIndicator
            size="small"
            color="#42A9FF"
          />
        </View>
      ) : pixPayload ? (
        <>
          <View
            style={
              styles.qrBox
            }
          >
            <QRCode
              value={
                pixPayload
              }
              size={190}
              backgroundColor="#FFFFFF"
              color="#050910"
              ecl="L"
            />
          </View>

          <Text
            selectable
            numberOfLines={3}
            style={
              styles.pixCode
            }
          >
            {pixPayload}
          </Text>

          <View
            style={
              styles.readyActions
            }
          >
            <NativePressable
              haptic
              disabled={busy}
              onPress={copyPix}
              style={
                styles.secondaryButton
              }
            >
              <View
                style={
                  styles.secondaryButtonInner
                }
              >
                {copied ? (
                  <Check
                    size={16}
                    color={
                      colors.textSoft
                    }
                  />
                ) : (
                  <Copy
                    size={16}
                    color={
                      colors.textSoft
                    }
                  />
                )}

                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  {copied
                    ? 'Copiado!'
                    : 'Copiar PIX'}
                </Text>
              </View>
            </NativePressable>

            <NativePressable
              haptic
              disabled={busy}
              onPress={() =>
                onPaid(
                  request,
                )
              }
              style={
                styles.primaryButton
              }
            >
              <View
                style={
                  styles.primaryButtonInner
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Já paguei
                </Text>
              </View>
            </NativePressable>
          </View>
        </>
      ) : (
        <Text
          style={
            styles.inlineError
          }
        >
          Não foi possível gerar o PIX. Tente novamente.
        </Text>
      )}
    </View>
  );
}

function IncomingCard({
  request,
  username,
  busy,
  onAnswer,
}: {
  request:
    EliseoPixRequest;
  username: string;
  busy: boolean;
  onAnswer: (
    request:
      EliseoPixRequest,
    accepted: boolean,
  ) => void;
}) {
  return (
    <View
      style={
        styles.requestCard
      }
    >
      <Text
        style={
          styles.cardTitle
        }
      >
        {request.action ===
        'charge'
          ? 'Cobrança P2P'
          : 'Pagamento P2P'}
      </Text>

      <Text
        style={
          styles.cardSubtitle
        }
      >
        @{username}{' '}
        {request.action ===
        'charge'
          ? 'está cobrando'
          : 'quer pagar'}{' '}
        {formatPixAmount(
          request.amountCents,
        )}{' '}
        {request.action ===
        'charge'
          ? 'de você.'
          : 'para você.'}
      </Text>

      <View
        style={
          styles.requestActions
        }
      >
        <NativePressable
          haptic
          disabled={busy}
          onPress={() =>
            onAnswer(
              request,
              false,
            )
          }
          style={
            styles.denyButton
          }
        >
          <View
            style={
              styles.denyButtonInner
            }
          >
            <Text
              style={
                styles.denyButtonText
              }
            >
              Negar
            </Text>
          </View>
        </NativePressable>

        <NativePressable
          haptic
          disabled={busy}
          onPress={() =>
            onAnswer(
              request,
              true,
            )
          }
          style={
            styles.primaryButton
          }
        >
          <View
            style={
              styles.primaryButtonInner
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Aceitar
            </Text>
          </View>
        </NativePressable>
      </View>
    </View>
  );
}

function ReceiptCard({
  request,
  username,
  busy,
  onConfirm,
}: {
  request:
    EliseoPixRequest;
  username: string;
  busy: boolean;
  onConfirm: (
    request:
      EliseoPixRequest,
    received: boolean,
  ) => void;
}) {
  return (
    <View
      style={
        styles.requestCard
      }
    >
      <Text
        style={
          styles.cardTitle
        }
      >
        Confirmar recebimento
      </Text>

      <Text
        style={
          styles.cardSubtitle
        }
      >
        @{username} marcou{' '}
        {formatPixAmount(
          request.amountCents,
        )}{' '}
        como pago. O valor já caiu na sua conta?
      </Text>

      <View
        style={
          styles.requestActions
        }
      >
        <NativePressable
          haptic
          disabled={busy}
          onPress={() =>
            onConfirm(
              request,
              false,
            )
          }
          style={
            styles.secondaryButton
          }
        >
          <View
            style={
              styles.secondaryButtonInner
            }
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Ainda não
            </Text>
          </View>
        </NativePressable>

        <NativePressable
          haptic
          disabled={busy}
          onPress={() =>
            onConfirm(
              request,
              true,
            )
          }
          style={
            styles.primaryButton
          }
        >
          <View
            style={
              styles.primaryButtonInner
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Confirmar
            </Text>
          </View>
        </NativePressable>
      </View>
    </View>
  );
}

export function PixPanel({
  visible,
  onClose,
  currentUid,
  context,
}: {
  visible: boolean;
  onClose: () => void;
  currentUid: string;
  context:
    PixPanelContext;
}) {
  const {palette} =
    useAppAppearance();

  const [
    pixKey,
    setPixKey,
  ] =
    useState('');

  const [
    keySaving,
    setKeySaving,
  ] =
    useState(false);

  const [
    keySaved,
    setKeySaved,
  ] =
    useState(false);

  const [
    action,
    setAction,
  ] =
    useState<
      EliseoPixAction
    >('pay');

  const [
    amount,
    setAmount,
  ] =
    useState('');

  const [
    serverMembers,
    setServerMembers,
  ] =
    useState<
      EliseoUser[]
    >([]);

  const [
    selectedServerUser,
    setSelectedServerUser,
  ] =
    useState<
      EliseoUser | null
    >(null);

  const [
    incoming,
    setIncoming,
  ] =
    useState<
      EliseoPixRequest[]
    >([]);

  const [
    outgoing,
    setOutgoing,
  ] =
    useState<
      EliseoPixRequest[]
    >([]);

  const [
    users,
    setUsers,
  ] =
    useState<
      Record<
        string,
        EliseoUser | null
      >
    >({});

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    loadingMembers,
    setLoadingMembers,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(() => {
    if (
      !visible ||
      !currentUid
    ) {
      return;
    }

    let alive = true;

    getMyPixKey(
      currentUid,
    )
      .then(
        key => {
          if (alive) {
            setPixKey(key);
          }
        },
      )
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [
    visible,
    currentUid,
  ]);

  useEffect(() => {
    if (!currentUid) {
      return;
    }

    const stopIncoming =
      listenToIncomingPixRequests(
        currentUid,
        setIncoming,
      );

    const stopOutgoing =
      listenToOutgoingPixRequests(
        currentUid,
        setOutgoing,
      );

    return () => {
      stopIncoming();
      stopOutgoing();
    };
  }, [
    currentUid,
  ]);

  useEffect(() => {
    if (
      !visible ||
      context.type !==
        'server'
    ) {
      return;
    }

    let alive = true;

    setLoadingMembers(true);

    getServerPixMembers(
      context.serverId,
      currentUid,
    )
      .then(
        members => {
          if (!alive) {
            return;
          }

          setServerMembers(
            members,
          );

          setSelectedServerUser(
            current =>
              current &&
              members.some(
                member =>
                  member.uid ===
                  current.uid,
              )
                ? current
                : members[0] ??
                  null,
          );
        },
      )
      .catch(
        caught => {
          if (alive) {
            setError(
              caught instanceof Error
                ? caught.message
                : 'Não foi possível carregar os membros.',
            );
          }
        },
      )
      .finally(
        () => {
          if (alive) {
            setLoadingMembers(false);
          }
        },
      );

    return () => {
      alive = false;
    };
  }, [
    visible,
    context,
    currentUid,
  ]);

  const currentRequests =
    useMemo(
      () =>
        [
          ...incoming,
          ...outgoing,
        ].filter(
          request =>
            sameContext(
              request,
              context,
            ),
        ),
      [
        incoming,
        outgoing,
        context,
      ],
    );

  const pending =
    useMemo(
      () =>
        incoming.filter(
          request =>
            request.status ===
              'pending' &&
            sameContext(
              request,
              context,
            ),
        ),
      [
        incoming,
        context,
      ],
    );

  const ready =
    useMemo(
      () =>
        currentRequests.filter(
          request => {
            const payerId =
              request.action ===
              'charge'
                ? request.targetId
                : request.initiatorId;

            return (
              request.status ===
                'accepted' &&
              payerId ===
                currentUid
            );
          },
        ),
      [
        currentRequests,
        currentUid,
      ],
    );

  const receipt =
    useMemo(
      () =>
        currentRequests.filter(
          request => {
            const receiverId =
              request.action ===
              'charge'
                ? request.initiatorId
                : request.targetId;

            return (
              request.status ===
                'payment_reported' &&
              receiverId ===
                currentUid
            );
          },
        ),
      [
        currentRequests,
        currentUid,
      ],
    );

  useEffect(() => {
    const ids =
      Array.from(
        new Set(
          currentRequests.map(
            request =>
              counterpartId(
                request,
                currentUid,
              ),
          ),
        ),
      ).filter(
        id =>
          !users[id],
      );

    if (
      ids.length ===
      0
    ) {
      return;
    }

    let alive = true;

    Promise.all(
      ids.map(
        async uid => ({
          uid,
          profile:
            await getUserById(
              uid,
            ),
        }),
      ),
    ).then(
      result => {
        if (!alive) {
          return;
        }

        setUsers(
          current => {
            const next = {
              ...current,
            };

            result.forEach(
              item => {
                next[item.uid] =
                  item.profile;
              },
            );

            return next;
          },
        );
      },
    );

    return () => {
      alive = false;
    };
  }, [
    currentRequests,
    currentUid,
    users,
  ]);

  const selectedTarget =
    context.type ===
    'dm'
      ? context.target
      : selectedServerUser;

  async function saveKey() {
    if (keySaving) {
      return;
    }

    try {
      setKeySaving(true);
      setKeySaved(false);
      setError('');

      const saved =
        await saveMyPixKey(
          currentUid,
          pixKey,
        );

      setPixKey(saved);
      setKeySaved(true);

      setTimeout(
        () =>
          setKeySaved(false),
        1600,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível salvar a chave PIX.',
      );
    } finally {
      setKeySaving(false);
    }
  }

  async function submit() {
    if (
      busy ||
      !selectedTarget
    ) {
      return;
    }

    const amountCents =
      parsePixAmount(
        amount,
      );

    if (!amountCents) {
      setError(
        'Digite um valor válido.',
      );
      return;
    }

    try {
      setBusy(true);
      setError('');

      await createPixRequest({
        initiatorId:
          currentUid,
        targetId:
          selectedTarget.uid,
        action,
        amountCents,
        contextType:
          context.type,
        conversationId:
          context.type ===
          'dm'
            ? context.conversationId
            : undefined,
        serverId:
          context.type ===
          'server'
            ? context.serverId
            : undefined,
        channelId:
          context.type ===
          'server'
            ? context.channelId
            : undefined,
      });

      setAmount('');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível criar a solicitação PIX.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function answer(
    request:
      EliseoPixRequest,
    accepted: boolean,
  ) {
    try {
      setBusy(true);
      setError('');

      await respondToPixRequest(
        request,
        currentUid,
        accepted,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível responder ao PIX.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function reportPaid(
    request:
      EliseoPixRequest,
  ) {
    try {
      setBusy(true);
      setError('');

      await markPixPaymentReported(
        request,
        currentUid,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível marcar o PIX como pago.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmReceipt(
    request:
      EliseoPixRequest,
    received: boolean,
  ) {
    try {
      setBusy(true);
      setError('');

      await confirmPixPaymentReceived(
        request,
        currentUid,
        received,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível confirmar o PIX.',
      );
    } finally {
      setBusy(false);
    }
  }

  function usernameFor(
    request:
      EliseoPixRequest,
  ) {
    const id =
      counterpartId(
        request,
        currentUid,
      );

    return (
      users[id]
        ?.username ||
      'usuario'
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.overlay
        }
      >
        <View
          style={[
            styles.modal,
            {
              backgroundColor:
                palette.bg,
              borderColor:
                palette.border,
            },
          ]}
        >
          <View
            style={
              styles.modalHeader
            }
          >
            <View>
              <Text
                style={
                  styles.modalTitle
                }
              >
                PIX P2P
              </Text>

              <Text
                style={
                  styles.modalSubtitle
                }
              >
                A chave só é revelada depois da confirmação.
              </Text>
            </View>

            <NativePressable
              haptic
              onPress={
                onClose
              }
              style={
                styles.closeButton
              }
            >
              <View
                style={
                  styles.closeButtonInner
                }
              >
                <X
                  size={19}
                  color={
                    colors.muted
                  }
                />
              </View>
            </NativePressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              styles.content
            }
          >
            <View
              style={
                styles.keyCard
              }
            >
              <View
                style={
                  styles.keyTitleRow
                }
              >
                <KeyRound
                  size={17}
                  color="#42A9FF"
                />

                <Text
                  style={
                    styles.keyTitle
                  }
                >
                  Minha chave PIX
                </Text>
              </View>

              <Text
                style={
                  styles.keyHelp
                }
              >
                Necessária para cobrar ou receber um pagamento.
              </Text>

              <View
                style={
                  styles.keyRow
                }
              >
                <TextInput
                  value={
                    pixKey
                  }
                  onChangeText={
                    setPixKey
                  }
                  placeholder="E-mail, CPF, telefone ou chave aleatória"
                  placeholderTextColor={
                    colors.faint
                  }
                  style={
                    styles.keyInput
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={
                    !keySaving
                  }
                />

                <NativePressable
                  haptic
                  disabled={
                    keySaving ||
                    !pixKey.trim()
                  }
                  onPress={() => {
                    void saveKey();
                  }}
                  style={
                    styles.keySave
                  }
                >
                  <View
                    style={
                      styles.keySaveInner
                    }
                  >
                    {keySaving ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          colors.white
                        }
                      />
                    ) : keySaved ? (
                      <Check
                        size={16}
                        color={
                          colors.white
                        }
                      />
                    ) : (
                      <Text
                        style={
                          styles.keySaveText
                        }
                      >
                        Salvar
                      </Text>
                    )}
                  </View>
                </NativePressable>
              </View>
            </View>

            <Text
              style={
                styles.sectionLabel
              }
            >
              Nova solicitação
            </Text>

            {context.type ===
            'server' ? (
              <View
                style={
                  styles.memberArea
                }
              >
                {loadingMembers ? (
                  <ActivityIndicator
                    size="small"
                    color="#42A9FF"
                  />
                ) : serverMembers.length ===
                  0 ? (
                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Não encontrei outro membro nesse servidor.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    contentContainerStyle={
                      styles.memberList
                    }
                  >
                    {serverMembers.map(
                      member => {
                        const active =
                          selectedServerUser?.uid ===
                          member.uid;

                        return (
                          <NativePressable
                            key={
                              member.uid
                            }
                            haptic
                            onPress={() =>
                              setSelectedServerUser(
                                member,
                              )
                            }
                            style={
                              styles.memberButton
                            }
                          >
                            <View
                              style={[
                                styles.memberChip,
                                active &&
                                  styles.memberChipActive,
                              ]}
                            >
                              <Avatar
                                name={
                                  member.username
                                }
                                uri={
                                  member.avatar
                                }
                                accent={
                                  colors.blue2
                                }
                                size={28}
                              />

                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.memberName,
                                  active &&
                                    styles.memberNameActive,
                                ]}
                              >
                                @{member.username}
                              </Text>
                            </View>
                          </NativePressable>
                        );
                      },
                    )}
                  </ScrollView>
                )}
              </View>
            ) : (
              <View
                style={
                  styles.dmTarget
                }
              >
                <Avatar
                  name={
                    context.target.username
                  }
                  uri={
                    context.target.avatar
                  }
                  accent={
                    colors.blue2
                  }
                  size={34}
                />

                <View>
                  <Text
                    style={
                      styles.targetName
                    }
                  >
                    @{context.target.username}
                  </Text>

                  <Text
                    style={
                      styles.targetHint
                    }
                  >
                    Pagamento entre vocês
                  </Text>
                </View>
              </View>
            )}

            <View
              style={
                styles.actionRow
              }
            >
              <NativePressable
                haptic
                onPress={() =>
                  setAction(
                    'pay',
                  )
                }
                style={
                  styles.actionButton
                }
              >
                <View
                  style={[
                    styles.actionButtonInner,
                    action ===
                      'pay' &&
                      styles.actionButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      action ===
                        'pay' &&
                        styles.actionButtonTextActive,
                    ]}
                  >
                    Pagar
                  </Text>
                </View>
              </NativePressable>

              <NativePressable
                haptic
                onPress={() =>
                  setAction(
                    'charge',
                  )
                }
                style={
                  styles.actionButton
                }
              >
                <View
                  style={[
                    styles.actionButtonInner,
                    action ===
                      'charge' &&
                      styles.actionButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      action ===
                        'charge' &&
                        styles.actionButtonTextActive,
                    ]}
                  >
                    Cobrar
                  </Text>
                </View>
              </NativePressable>
            </View>

            <View
              style={
                styles.amountRow
              }
            >
              <View
                style={
                  styles.amountInputWrap
                }
              >
                <Text
                  style={
                    styles.currency
                  }
                >
                  R$
                </Text>

                <TextInput
                  value={
                    amount
                  }
                  onChangeText={
                    setAmount
                  }
                  placeholder="0,00"
                  placeholderTextColor={
                    colors.faint
                  }
                  keyboardType="decimal-pad"
                  style={
                    styles.amountInput
                  }
                  editable={
                    !busy
                  }
                />
              </View>

              <NativePressable
                haptic
                disabled={
                  busy ||
                  !selectedTarget ||
                  !amount.trim()
                }
                onPress={() => {
                  void submit();
                }}
                style={
                  styles.submitButton
                }
              >
                <View
                  style={
                    styles.submitButtonInner
                  }
                >
                  {busy ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        colors.white
                      }
                    />
                  ) : (
                    <Send
                      size={17}
                      color={
                        colors.white
                      }
                    />
                  )}
                </View>
              </NativePressable>
            </View>

            {!!error && (
              <Text
                style={
                  styles.inlineError
                }
              >
                {error}
              </Text>
            )}

            {pending.length >
              0 && (
              <>
                <Text
                  style={
                    styles.sectionLabel
                  }
                >
                  Aguardando sua resposta
                </Text>

                {pending.map(
                  request => (
                    <IncomingCard
                      key={
                        request.id
                      }
                      request={
                        request
                      }
                      username={
                        usernameFor(
                          request,
                        )
                      }
                      busy={busy}
                      onAnswer={
                        answer
                      }
                    />
                  ),
                )}
              </>
            )}

            {ready.length >
              0 && (
              <>
                <Text
                  style={
                    styles.sectionLabel
                  }
                >
                  Pronto para pagar
                </Text>

                {ready.map(
                  request => (
                    <PixReadyCard
                      key={
                        request.id
                      }
                      request={
                        request
                      }
                      username={
                        usernameFor(
                          request,
                        )
                      }
                      busy={busy}
                      onPaid={
                        reportPaid
                      }
                    />
                  ),
                )}
              </>
            )}

            {receipt.length >
              0 && (
              <>
                <Text
                  style={
                    styles.sectionLabel
                  }
                >
                  Confirmar pagamento
                </Text>

                {receipt.map(
                  request => (
                    <ReceiptCard
                      key={
                        request.id
                      }
                      request={
                        request
                      }
                      username={
                        usernameFor(
                          request,
                        )
                      }
                      busy={busy}
                      onConfirm={
                        confirmReceipt
                      }
                    />
                  ),
                )}
              </>
            )}

            <View
              style={
                styles.footerNote
              }
            >
              <Text
                style={
                  styles.footerNoteText
                }
              >
                O Elíseo gera o PIX e organiza as confirmações. O dinheiro é transferido diretamente entre as contas PIX; “Já paguei” não consulta o banco automaticamente.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent:
        'flex-end',
      backgroundColor:
        'rgba(2,5,10,0.72)',
    },

    modal: {
      maxHeight: '91%',
      minHeight: '58%',
      backgroundColor:
        colors.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor:
        'rgba(255,255,255,0.055)',
    },

    modalHeader: {
      minHeight: 74,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal:
        spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor:
        'rgba(255,255,255,0.045)',
    },

    modalTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: -0.4,
    },

    modalSubtitle: {
      marginTop: 3,
      color: colors.faint,
      fontSize: 9,
    },

    closeButton: {
      width: 40,
      height: 40,
      marginLeft: 'auto',
    },

    closeButtonInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.panel2,
      borderRadius: 13,
    },

    content: {
      padding:
        spacing.md,
      paddingBottom: 36,
    },

    keyCard: {
      padding: 13,
      backgroundColor:
        colors.panel,
      borderRadius:
        radii.md,
    },

    keyTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    keyTitle: {
      color:
        colors.textSoft,
      fontSize: 12,
      fontWeight: '700',
    },

    keyHelp: {
      marginTop: 5,
      color: colors.faint,
      fontSize: 9,
      lineHeight: 13,
    },

    keyRow: {
      marginTop: 10,
      flexDirection: 'row',
      gap: 7,
    },

    keyInput: {
      flex: 1,
      height: 44,
      paddingHorizontal: 11,
      color: colors.text,
      fontSize: 11,
      backgroundColor:
        colors.panel2,
      borderRadius: 12,
    },

    keySave: {
      width: 70,
      height: 44,
    },

    keySaveInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.blue2,
      borderRadius: 12,
    },

    keySaveText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: '700',
    },

    sectionLabel: {
      marginTop: 20,
      marginBottom: 8,
      paddingHorizontal: 3,
      color: colors.muted,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform:
        'uppercase',
    },

    dmTarget: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      backgroundColor:
        colors.panel,
      borderRadius:
        radii.md,
    },

    targetName: {
      color:
        colors.textSoft,
      fontSize: 12,
      fontWeight: '700',
    },

    targetHint: {
      marginTop: 2,
      color: colors.faint,
      fontSize: 9,
    },

    memberArea: {
      minHeight: 58,
      justifyContent:
        'center',
    },

    memberList: {
      gap: 7,
      paddingRight: 8,
    },

    memberButton: {
      height: 50,
    },

    memberChip: {
      height: 50,
      minWidth: 118,
      maxWidth: 180,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 9,
      backgroundColor:
        colors.panel,
      borderWidth: 1,
      borderColor:
        'transparent',
      borderRadius: 14,
    },

    memberChipActive: {
      backgroundColor:
        'rgba(66,169,255,0.09)',
      borderColor:
        'rgba(66,169,255,0.32)',
    },

    memberName: {
      flexShrink: 1,
      color: colors.muted,
      fontSize: 10,
      fontWeight: '600',
    },

    memberNameActive: {
      color: '#42A9FF',
    },

    emptyText: {
      color: colors.faint,
      fontSize: 10,
    },

    actionRow: {
      height: 44,
      flexDirection: 'row',
      gap: 7,
      marginTop: 9,
    },

    actionButton: {
      flex: 1,
      height: 44,
    },

    actionButtonInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.panel2,
      borderRadius: 12,
    },

    actionButtonActive: {
      backgroundColor:
        'rgba(66,169,255,0.12)',
    },

    actionButtonText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
    },

    actionButtonTextActive: {
      color: '#42A9FF',
    },

    amountRow: {
      height: 48,
      marginTop: 8,
      flexDirection: 'row',
      gap: 7,
    },

    amountInputWrap: {
      flex: 1,
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      backgroundColor:
        colors.panel2,
      borderRadius: 13,
    },

    currency: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
    },

    amountInput: {
      flex: 1,
      height: 48,
      paddingHorizontal: 8,
      color: colors.text,
      fontSize: 14,
    },

    submitButton: {
      width: 48,
      height: 48,
    },

    submitButtonInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.blue2,
      borderRadius: 13,
    },

    inlineError: {
      marginTop: 9,
      color: '#FF8798',
      fontSize: 10,
      lineHeight: 14,
    },

    requestCard: {
      marginBottom: 8,
      padding: 13,
      backgroundColor:
        colors.panel,
      borderRadius:
        radii.md,
    },

    readyCard: {
      marginBottom: 9,
      padding: 13,
      backgroundColor:
        colors.panel,
      borderRadius:
        radii.md,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    statusIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(66,169,255,0.09)',
      borderRadius: 12,
    },

    cardHeaderText: {
      flex: 1,
    },

    cardTitle: {
      color:
        colors.textSoft,
      fontSize: 12,
      fontWeight: '700',
    },

    cardSubtitle: {
      marginTop: 4,
      color: colors.muted,
      fontSize: 10,
      lineHeight: 14,
    },

    requestActions: {
      height: 42,
      marginTop: 12,
      flexDirection: 'row',
      gap: 7,
    },

    readyActions: {
      height: 42,
      marginTop: 10,
      flexDirection: 'row',
      gap: 7,
    },

    primaryButton: {
      flex: 1,
      height: 42,
    },

    primaryButtonInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      backgroundColor:
        colors.blue2,
      borderRadius: 12,
    },

    primaryButtonText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: '700',
    },

    secondaryButton: {
      flex: 1,
      height: 42,
    },

    secondaryButtonInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      backgroundColor:
        colors.panel2,
      borderRadius: 12,
    },

    secondaryButtonText: {
      color:
        colors.textSoft,
      fontSize: 10,
      fontWeight: '700',
    },

    denyButton: {
      flex: 1,
      height: 42,
    },

    denyButtonInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(239,62,88,0.08)',
      borderRadius: 12,
    },

    denyButtonText: {
      color: colors.red,
      fontSize: 10,
      fontWeight: '700',
    },

    qrLoading: {
      height: 208,
      alignItems: 'center',
      justifyContent: 'center',
    },

    qrBox: {
      width: 208,
      height: 208,
      marginTop: 13,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 15,
    },

    pixCode: {
      maxHeight: 52,
      marginTop: 10,
      padding: 9,
      color: colors.faint,
      fontSize: 8,
      lineHeight: 11,
      backgroundColor:
        colors.panel2,
      borderRadius: 10,
    },

    footerNote: {
      marginTop: 17,
      paddingHorizontal: 4,
    },

    footerNoteText: {
      color: colors.faint,
      fontSize: 8,
      lineHeight: 12,
      textAlign: 'center',
    },
  });

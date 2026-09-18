import { memo, useEffect, useState } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ChatMessage, PollDetail } from '../../types/api';

import { useTheme } from '../../theme/ThemeContext';

import { formatPollTimeRemaining } from '../../utils/pollExpiry';



type Props = {

  message: ChatMessage;

  poll: PollDetail;

  showResults: boolean;

  canManageGroups: boolean;

  memberPortal: boolean;

  onVote: (pollId: string, optionId: string) => void;

  onClosePoll: (pollId: string) => void;

};



export const PollMessageBubble = memo(function PollMessageBubble({

  message,

  poll,

  showResults,

  canManageGroups,

  memberPortal,

  onVote,

  onClosePoll,

}: Props) {

  const { theme } = useTheme();

  const mine = message.mine;

  const [timeLabel, setTimeLabel] = useState(() =>

    formatPollTimeRemaining(poll.expiresAt, poll.expired, poll.status)

  );



  useEffect(() => {

    setTimeLabel(formatPollTimeRemaining(poll.expiresAt, poll.expired, poll.status));

    if (!poll.expiresAt || poll.status === 'CLOSED') return undefined;

    const timer = setInterval(() => {

      setTimeLabel(formatPollTimeRemaining(poll.expiresAt, poll.expired, poll.status));

    }, 30_000);

    return () => clearInterval(timer);

  }, [poll.expiresAt, poll.expired, poll.status]);



  return (

    <View style={[styles.pollCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>

      {!mine ? (

        <Text style={[styles.senderName, { color: theme.textMuted }]}>{message.senderName}</Text>

      ) : null}



      <View style={styles.pollHead}>

        <View style={[styles.pollIconWrap, { backgroundColor: theme.accentSoft }]}>

          <Text style={styles.pollIcon}>📊</Text>

        </View>

        <View style={styles.pollHeadText}>

          <Text style={[styles.pollHeadLabel, { color: theme.accent }]}>Poll</Text>

          {poll.status === 'CLOSED' ? (

            <Text style={styles.pollClosed}>Closed</Text>

          ) : null}

        </View>

      </View>



      <Text style={[styles.pollQuestion, { color: theme.text }]}>{poll.question}</Text>



      <View style={styles.options}>

        {poll.options.map((option) => {

          const selected = poll.myVoteOptionId === option.optionId;

          const percentage = Math.max(0, Math.min(100, option.percentage ?? 0));

          return (

            <Pressable

              key={option.optionId}

              style={[

                styles.option,

                {

                  borderColor: selected ? theme.accent : theme.inputBorder,

                  backgroundColor: selected ? theme.accentSoft : theme.inputBg,

                },

              ]}

              disabled={!poll.canVote}

              onPress={() => onVote(poll.pollId, option.optionId)}

            >

              <View style={styles.optionTop}>

                <Text style={[styles.optionLabel, { color: theme.text }]}>{option.label}</Text>

                {showResults ? (

                  <Text style={[styles.optionMeta, { color: theme.textMuted }]}>

                    {option.voteCount ?? 0} · {percentage}%

                  </Text>

                ) : null}

              </View>

              {showResults ? (

                <View style={[styles.optionBar, { backgroundColor: theme.divider }]}>

                  <View

                    style={[

                      styles.optionFill,

                      { width: `${percentage}%`, backgroundColor: theme.accent },

                    ]}

                  />

                </View>

              ) : null}

            </Pressable>

          );

        })}

      </View>



      <View style={styles.footer}>

        <Text style={[styles.votes, { color: theme.textMuted }]}>

          {poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}

        </Text>

        {canManageGroups && !memberPortal && poll.status === 'ACTIVE' ? (

          <Pressable onPress={() => onClosePoll(poll.pollId)} hitSlop={8}>

            <Text style={styles.closeBtn}>Close poll</Text>

          </Pressable>

        ) : null}

      </View>

      {timeLabel ? (

        <Text style={[styles.expiry, { color: theme.textMuted }]}>{timeLabel}</Text>

      ) : null}

      <Text style={[styles.time, { color: theme.textMuted }]}>{formatTime(message.sentAt)}</Text>

    </View>

  );

});



function formatTime(iso: string | null | undefined): string {

  if (!iso) return '';

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });

}



const styles = StyleSheet.create({

  pollCard: {

    maxWidth: '92%',

    minWidth: 280,

    borderWidth: 1,

    borderRadius: 14,

    paddingHorizontal: 12,

    paddingVertical: 10,

    shadowColor: '#000',

    shadowOpacity: 0.06,

    shadowRadius: 8,

    shadowOffset: { width: 0, height: 2 },

    elevation: 2,

  },

  senderName: { fontSize: 11, fontWeight: '700', marginBottom: 4 },

  pollHead: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,

    marginBottom: 8,

  },

  pollIconWrap: {

    width: 34,

    height: 34,

    borderRadius: 17,

    alignItems: 'center',

    justifyContent: 'center',

  },

  pollIcon: { fontSize: 16 },

  pollHeadText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },

  pollHeadLabel: {

    fontSize: 12,

    fontWeight: '800',

    textTransform: 'uppercase',

    letterSpacing: 0.6,

  },

  pollClosed: { fontSize: 12, fontWeight: '700', color: '#b45309' },

  pollQuestion: { fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 10 },

  options: { gap: 8 },

  option: {

    borderWidth: 1,

    borderRadius: 12,

    paddingHorizontal: 12,

    paddingVertical: 10,

    gap: 6,

  },

  optionTop: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    justifyContent: 'space-between',

    gap: 8,

  },

  optionLabel: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 20 },

  optionMeta: { fontSize: 12, fontWeight: '600' },

  optionBar: {

    height: 4,

    borderRadius: 999,

    overflow: 'hidden',

  },

  optionFill: {

    height: '100%',

    borderRadius: 999,

  },

  footer: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginTop: 10,

    gap: 8,

  },

  votes: { fontSize: 12 },

  closeBtn: { fontSize: 12, fontWeight: '700', color: '#b45309' },

  expiry: { fontSize: 12, fontWeight: '700', color: '#b45309', marginTop: 6 },

  time: { fontSize: 10, marginTop: 6, alignSelf: 'flex-end' },

});


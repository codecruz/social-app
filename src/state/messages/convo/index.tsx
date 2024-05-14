import React, {useContext, useState, useSyncExternalStore} from 'react'
import {AppState} from 'react-native'
import {useFocusEffect, useIsFocused} from '@react-navigation/native'

import {Convo} from '#/state/messages/convo/agent'
import {
  ConvoParams,
  ConvoState,
  ConvoStatus,
} from '#/state/messages/convo/types'
import {isConvoReady} from '#/state/messages/convo/util'
import {useMessagesEventBus} from '#/state/messages/events'
import {useMarkAsReadMutation} from '#/state/queries/messages/conversation'
import {useAgent} from '#/state/session'

export * from '#/state/messages/convo/util'

const ChatContext = React.createContext<ConvoState | null>(null)

export function useConvo() {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error('useConvo must be used within a ConvoProvider')
  }
  return ctx
}

export function useConvoActive() {
  const ctx = useContext(ChatContext) as ConvoState & {
    status: ConvoStatus.Ready | ConvoStatus.Backgrounded | ConvoStatus.Suspended
  }
  if (!ctx) {
    throw new Error('useConvo must be used within a ConvoProvider')
  }
  if (!isConvoReady(ctx)) {
    throw new Error(
      `useConvoActive must only be rendered when the Convo is ready. Current status: ${ctx.status}`,
    )
  }
  return ctx
}

export function ConvoProvider({
  children,
  convoId,
}: Pick<ConvoParams, 'convoId'> & {children: React.ReactNode}) {
  const isScreenFocused = useIsFocused()
  const {getAgent} = useAgent()
  const events = useMessagesEventBus()
  const [convo] = useState(
    () =>
      new Convo({
        convoId,
        agent: getAgent(),
        events,
      }),
  )
  const service = useSyncExternalStore(convo.subscribe, convo.getSnapshot)
  const {mutate: markAsRead} = useMarkAsReadMutation()

  useFocusEffect(
    React.useCallback(() => {
      convo.resume()
      markAsRead({convoId})

      return () => {
        convo.background()
        markAsRead({convoId})
      }
    }, [convo, convoId, markAsRead]),
  )

  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (isScreenFocused) {
        if (nextAppState === 'active') {
          convo.resume()
        } else {
          convo.background()
        }

        markAsRead({convoId})
      }
    }

    const sub = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      sub.remove()
    }
  }, [convoId, convo, isScreenFocused, markAsRead])

  return <ChatContext.Provider value={service}>{children}</ChatContext.Provider>
}

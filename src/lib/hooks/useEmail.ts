import {useServiceConfigQuery} from '#/state/queries/email-verification-required'
import {useSession} from '#/state/session'
import {BSKY_SERVICE} from '../constants'
import {getHostnameFromUrl} from '../strings/url-helpers'

export function useEmail() {
  const {currentAccount} = useSession()

  const {data: serviceConfig} = useServiceConfigQuery()

  const checkEmailConfirmed = !!serviceConfig?.checkEmailConfirmed

  const isSelfHost =
    currentAccount &&
    getHostnameFromUrl(currentAccount.service) !==
      getHostnameFromUrl(BSKY_SERVICE)

  const needsEmailVerification =
    checkEmailConfirmed && !isSelfHost && !currentAccount?.emailConfirmed

  return {needsEmailVerification}
}

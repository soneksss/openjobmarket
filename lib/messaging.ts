import { createClient } from "@/lib/client"

export interface SendMessageParams {
  senderId: string
  recipientId: string
  subject: string
  content: string
  jobId?: string
  conversationId?: string
  messageType?: 'direct' | 'reply' | 'job_inquiry'
  sharePersonalInfo?: boolean
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  content: string
  message_type: string
  job_id?: string
  conversation_id?: string
  is_read: boolean
  share_personal_info?: boolean
  created_at: string
  updated_at: string
}

export class MessagingService {
  private supabase = createClient()

  async sendMessage(params: SendMessageParams): Promise<{ data: Message | null; error: any }> {
    try {
      console.log('[Messaging] Sending message:', params)

      // If no conversation ID provided, try to find existing conversation
      let conversationId = params.conversationId
      if (!conversationId) {
        const { data: existingMessages } = await this.supabase
          .from('messages')
          .select('conversation_id')
          .or(`and(sender_id.eq.${params.senderId},recipient_id.eq.${params.recipientId}),and(sender_id.eq.${params.recipientId},recipient_id.eq.${params.senderId})`)
          .eq('job_id', params.jobId || null)
          .limit(1)

        if (existingMessages && existingMessages.length > 0) {
          conversationId = existingMessages[0].conversation_id
        }
      }

      const messageData = {
        sender_id: params.senderId,
        recipient_id: params.recipientId,
        subject: params.subject,
        content: params.content,
        message_type: params.messageType || 'direct',
        job_id: params.jobId || null,
        conversation_id: conversationId || null,
        share_personal_info: params.sharePersonalInfo || false,
        is_read: false
      }

      const { data, error } = await this.supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (error) {
        console.error('[Messaging] Error sending message:', error)
        return { data: null, error }
      }

      console.log('[Messaging] Message sent successfully:', data)

      // If professional shared personal info, update privacy permissions
      if (params.sharePersonalInfo && data) {
        await this.grantPrivacyPermission(params.senderId, params.recipientId)
      }

      return { data, error: null }
    } catch (error) {
      console.error('[Messaging] Unexpected error:', error)
      return { data: null, error }
    }
  }

  async getConversation(conversationId: string): Promise<{ data: Message[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(full_name, nickname, profile_photo_url),
          recipient:users!messages_recipient_id_fkey(full_name, nickname, profile_photo_url),
          job:jobs(title)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      return { data, error }
    } catch (error) {
      console.error('[Messaging] Error fetching conversation:', error)
      return { data: null, error }
    }
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', userId)
        .eq('is_read', false)

      return { error }
    } catch (error) {
      console.error('[Messaging] Error marking conversation as read:', error)
      return { error }
    }
  }

  async getUserMessages(userId: string): Promise<{ inbox: Message[]; sent: Message[]; error: any }> {
    try {
      // Get inbox messages
      const { data: inbox, error: inboxError } = await this.supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(full_name, nickname, profile_photo_url),
          job:jobs(title)
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })

      if (inboxError) {
        return { inbox: [], sent: [], error: inboxError }
      }

      // Get sent messages
      const { data: sent, error: sentError } = await this.supabase
        .from('messages')
        .select(`
          *,
          recipient:users!messages_recipient_id_fkey(full_name, nickname, profile_photo_url),
          job:jobs(title)
        `)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })

      if (sentError) {
        return { inbox: inbox || [], sent: [], error: sentError }
      }

      return { inbox: inbox || [], sent: sent || [], error: null }
    } catch (error) {
      console.error('[Messaging] Error fetching user messages:', error)
      return { inbox: [], sent: [], error }
    }
  }

  private async grantPrivacyPermission(professionalId: string, employerId: string): Promise<void> {
    try {
      await this.supabase
        .from('employer_privacy_permissions')
        .upsert({
          professional_id: professionalId,
          employer_id: employerId,
          can_see_personal_info: true,
          is_active: true,
          granted_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('[Messaging] Error granting privacy permission:', error)
    }
  }

  async checkPrivacyPermission(professionalId: string, employerId: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('employer_privacy_permissions')
        .select('can_see_personal_info')
        .eq('professional_id', professionalId)
        .eq('employer_id', employerId)
        .eq('is_active', true)
        .single()

      return data?.can_see_personal_info || false
    } catch (error) {
      console.error('[Messaging] Error checking privacy permission:', error)
      return false
    }
  }
}

export const messagingService = new MessagingService()
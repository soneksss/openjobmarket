/**
 * Email Templates for Notifications
 * All templates use responsive HTML design
 */

interface NewMessageEmailParams {
  recipientName: string
  senderName: string
  messageSubject: string
  messagePreview: string
  conversationUrl: string
  settingsUrl: string
}

interface JobApplicationEmailParams {
  recipientName: string
  applicantName: string
  jobTitle: string
  applicationMessage?: string
  applicationUrl: string
  settingsUrl: string
}

interface JobOfferEmailParams {
  recipientName: string
  companyName: string
  jobTitle: string
  messagePreview: string
  messageUrl: string
  settingsUrl: string
}

/**
 * Base email wrapper with consistent styling
 */
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenJobMarket Notification</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 500;
    }
    .button:hover {
      background: #5568d3;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .preview-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .info-badge {
      display: inline-block;
      background: #e7f3ff;
      color: #0066cc;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>This is an automated notification from <strong>OpenJobMarket</strong></p>
      <p>
        <a href="{{settingsUrl}}">Manage Notification Settings</a> |
        <a href="https://openjobmarket.com">Visit OpenJobMarket</a>
      </p>
      <p style="margin-top: 15px; color: #999;">
        © ${new Date().getFullYear()} OpenJobMarket. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * New Message Notification Email
 */
export function newMessageEmail(params: NewMessageEmailParams): { html: string; text: string } {
  const content = `
    <div class="header">
      <h1>💬 New Message</h1>
    </div>
    <div class="content">
      <h2>Hi ${params.recipientName},</h2>
      <p>You have received a new message from <strong>${params.senderName}</strong>.</p>

      <div class="info-badge">Subject: ${params.messageSubject}</div>

      <div class="preview-box">
        <strong>Message Preview:</strong>
        <p style="margin: 10px 0 0 0;">${params.messagePreview}</p>
      </div>

      <a href="${params.conversationUrl}" class="button">View Message</a>

      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        Reply directly to continue the conversation.
      </p>
    </div>
  `

  const html = emailWrapper(content.replace('{{settingsUrl}}', params.settingsUrl))

  const text = `
Hi ${params.recipientName},

You have received a new message from ${params.senderName}.

Subject: ${params.messageSubject}

Message Preview:
${params.messagePreview}

View and reply to this message:
${params.conversationUrl}

---
Manage your notification settings: ${params.settingsUrl}
© ${new Date().getFullYear()} OpenJobMarket
  `.trim()

  return { html, text }
}

/**
 * Job Application Notification Email (for homeowner/company)
 */
export function jobApplicationEmail(params: JobApplicationEmailParams): { html: string; text: string } {
  const content = `
    <div class="header">
      <h1>📋 New Job Application</h1>
    </div>
    <div class="content">
      <h2>Hi ${params.recipientName},</h2>
      <p><strong>${params.applicantName}</strong> has applied for your job posting:</p>

      <div class="info-badge">📌 ${params.jobTitle}</div>

      ${params.applicationMessage ? `
        <div class="preview-box">
          <strong>Application Message:</strong>
          <p style="margin: 10px 0 0 0;">${params.applicationMessage}</p>
        </div>
      ` : ''}

      <a href="${params.applicationUrl}" class="button">View Application</a>

      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        Review the applicant's profile and CV to make your decision.
      </p>
    </div>
  `

  const html = emailWrapper(content.replace('{{settingsUrl}}', params.settingsUrl))

  const text = `
Hi ${params.recipientName},

${params.applicantName} has applied for your job posting: ${params.jobTitle}

${params.applicationMessage ? `Application Message:\n${params.applicationMessage}\n\n` : ''}

View the full application and applicant profile:
${params.applicationUrl}

---
Manage your notification settings: ${params.settingsUrl}
© ${new Date().getFullYear()} OpenJobMarket
  `.trim()

  return { html, text }
}

/**
 * Job Offer/Inquiry Notification Email (for jobseeker/tradesperson)
 */
export function jobOfferEmail(params: JobOfferEmailParams): { html: string; text: string } {
  const content = `
    <div class="header">
      <h1>🎉 New Job Opportunity</h1>
    </div>
    <div class="content">
      <h2>Hi ${params.recipientName},</h2>
      <p><strong>${params.companyName}</strong> has sent you a message about a job opportunity:</p>

      <div class="info-badge">💼 ${params.jobTitle}</div>

      <div class="preview-box">
        <strong>Message Preview:</strong>
        <p style="margin: 10px 0 0 0;">${params.messagePreview}</p>
      </div>

      <a href="${params.messageUrl}" class="button">View Job Offer</a>

      <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
        Respond quickly to show your interest!
      </p>
    </div>
  `

  const html = emailWrapper(content.replace('{{settingsUrl}}', params.settingsUrl))

  const text = `
Hi ${params.recipientName},

${params.companyName} has sent you a message about a job opportunity: ${params.jobTitle}

Message Preview:
${params.messagePreview}

View the full message and respond:
${params.messageUrl}

---
Manage your notification settings: ${params.settingsUrl}
© ${new Date().getFullYear()} OpenJobMarket
  `.trim()

  return { html, text }
}

/**
 * Generic Message Notification (fallback)
 */
export function genericMessageEmail(
  recipientName: string,
  senderName: string,
  messagePreview: string,
  messageUrl: string,
  settingsUrl: string
): { html: string; text: string } {
  const content = `
    <div class="header">
      <h1>💬 New Message</h1>
    </div>
    <div class="content">
      <h2>Hi ${recipientName},</h2>
      <p>You have received a new message from <strong>${senderName}</strong>.</p>

      <div class="preview-box">
        <p style="margin: 0;">${messagePreview}</p>
      </div>

      <a href="${messageUrl}" class="button">View Message</a>
    </div>
  `

  const html = emailWrapper(content.replace('{{settingsUrl}}', settingsUrl))

  const text = `
Hi ${recipientName},

You have received a new message from ${senderName}.

${messagePreview}

View message: ${messageUrl}

---
Manage your notification settings: ${settingsUrl}
© ${new Date().getFullYear()} OpenJobMarket
  `.trim()

  return { html, text }
}

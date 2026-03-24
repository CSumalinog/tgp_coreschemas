import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendWelcomeEmail(email: string, full_name: string, password: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping welcome email");
    return;
  }

  const firstName = full_name.trim().split(" ")[0];

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Inter',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#121212;padding:28px 32px;text-align:center;">
                <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="background:#F5C52B;border-radius:8px;padding:8px 14px;">
                      <span style="font-size:18px;font-weight:800;color:#353535;letter-spacing:-0.03em;">cs</span>
                    </td>
                    <td style="padding-left:12px;">
                      <span style="font-size:16px;font-weight:700;color:#ffffff;">core schemas</span>
                    </td>
                  </tr>
                </table>
                <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:12px 0 0;">The Gold Panicles — Coverage Management System</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Welcome, ${firstName}! 👋</p>
                <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.6;">
                  Your account on <strong>TGP Core Schemas</strong> has been created. Here are your login credentials.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:28px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 16px;">Your Credentials</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">Email</span>
                        <span style="font-size:14px;font-weight:600;color:#1a1a1a;">${email}</span>
                      </td></tr>
                      <tr><td style="padding:8px 0;">
                        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">Password</span>
                        <span style="font-size:14px;font-weight:600;color:#1a1a1a;font-family:monospace;background:#f3f4f6;padding:4px 8px;border-radius:4px;">${password}</span>
                      </td></tr>
                    </table>
                  </td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                  <tr><td align="center">
                    <a href="https://tgp-coreschemas.vercel.app/login"
                      style="display:inline-block;background:#F5C52B;color:#353535;font-size:14px;font-weight:700;padding:12px 32px;border-radius:9px;text-decoration:none;">
                      Log In to Core Schemas
                    </a>
                  </td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;">
                    <p style="font-size:13px;color:#c2410c;margin:0;line-height:1.55;">
                      ⚠️ For security, please change your password after your first login via <strong>Profile &amp; Settings</strong>.
                    </p>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
                <p style="font-size:12px;color:#9ca3af;margin:0;">
                  This email was sent by TGP Core Schemas. If you didn't expect this, please contact your admin.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TGP Core Schemas <onboarding@resend.dev>",
        to: email,
        subject: "Welcome to TGP Core Schemas — Your Account is Ready",
        html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
    } else {
      console.log("Welcome email sent to:", email);
    }
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body));

    const { email, password, full_name, role, division, section, position, designation } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, password, full_name, role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      console.error("Create user error:", createError.message);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = data.user.id;
    console.log("Created user:", userId);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id:          userId,
        full_name,
        role,
        division:    division    || null,
        section:     section     || null,
        position:    position    || null,
        designation: designation || null,
        is_active:   true,
      });

    if (profileError) {
      console.error("Profile error:", profileError.message);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sendWelcomeEmail(email, full_name, password);

    return new Response(JSON.stringify({ userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Unexpected error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
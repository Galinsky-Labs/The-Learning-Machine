// TLM-086: provider-neutral tutor interface. A provider is {id, available, generate({system, prompt, maxTokens, signal}) -> {text}}.
// No provider is required: when none is configured the tutor uses the labelled offline route.
export function createDisabledProvider(reason='No AI tutor provider is configured.'){
 return Object.freeze({id:'none',available:false,reason,async generate(){throw new Error(reason)}});
}
// Suggested provider (owner decision pending): Anthropic Claude via the official SDK, enabled only when ANTHROPIC_API_KEY is set.
export function createAnthropicProvider({apiKey,model='claude-opus-5-5',loadSdk=()=>import('@anthropic-ai/sdk')}={}){
 if(!apiKey)return createDisabledProvider('ANTHROPIC_API_KEY is not set; the offline authored tutor is used.');
 let client=null;
 return Object.freeze({id:'anthropic',model,available:true,
  async generate({system,prompt,maxTokens,signal}){
   if(!client){const {default:Anthropic}=await loadSdk();client=new Anthropic({apiKey,maxRetries:1,timeout:20000})}
   const response=await client.beta.messages.create({model,max_tokens:maxTokens,system,messages:[{role:'user',content:prompt}],
    output_config:{effort:'low'},betas:['server-side-fallback-2026-07-01'],fallbacks:'default'},{signal});
   if(response.stop_reason==='refusal')throw new Error('The provider declined this request.');
   const text=response.content.filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
   if(!text)throw new Error('The provider returned no text.');
   return {text,model:response.model};
  }});
}

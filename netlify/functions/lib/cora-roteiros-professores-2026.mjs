/* Atribuições de Roteiros declaradas pela Gestão, 08/11/2026.
 * O nome é somente pista para vincular uma conta existente: exigimos correspondência
 * não ambígua entre os usuários cadastrados e o segmento correspondente.
 * Nunca criar e-mails, contas ou senhas a partir de primeiro nome.
 */
export const GRADES_FII=['6º ano','7º ano','8º ano','9º ano'];
export const GRADES_EM=['1ª série','2ª série','3ª série'];
const all=[...GRADES_FII,...GRADES_EM];
const pairs=(grades,subjects)=>grades.flatMap(grade=>subjects.map(subject=>({grade,subject})));
export const TEACHER_PLAN=[
 {person:'Herculano',aliases:['Herculano'],assignments:[
   ...pairs(GRADES_FII,['GRAMÁTICA','INTERPRETAÇÃO']),
   ...pairs(GRADES_EM,['LITERATURA']),
   ...pairs(['2ª série','3ª série'],['PRODUÇÃO TEXTUAL'])]},
 {person:'Lucivania',aliases:['Lucivania','Lucivânia'],assignments:pairs(GRADES_EM,['LÍNGUA PORTUGUESA'])},
 {person:'Charles',aliases:['Charles'],assignments:pairs([...GRADES_FII,'1ª série'],['PRODUÇÃO TEXTUAL'])},
 {person:'Marcia',aliases:['Marcia','Márcia'],assignments:pairs(GRADES_FII,['INGLÊS'])},
 {person:'Emanuel',aliases:['Emanuel'],assignments:pairs(GRADES_EM,['INGLÊS'])},
 {person:'Júlia',aliases:['Júlia','Julia'],assignments:[
   ...pairs(['6º ano','7º ano'],['HISTÓRIA','FILOSOFIA']),
   ...pairs([...GRADES_FII,'1ª série'],['ARTE'])]},
 {person:'Mônica',aliases:['Mônica','Monica'],assignments:pairs(['9º ano',...GRADES_EM],['FÍSICA'])},
 {person:'Renan',aliases:['Renan'],assignments:pairs(['8º ano','9º ano',...GRADES_EM],['HISTÓRIA','FILOSOFIA','SOCIOLOGIA'])},
 {person:'Mariana',aliases:['Mariana'],assignments:pairs(['8º ano','9º ano',...GRADES_EM],['GEOGRAFIA'])},
 {person:'Alana',aliases:['Alana'],assignments:pairs(['6º ano','7º ano'],['GEOGRAFIA'])},
 {person:'Charlyson',aliases:['Charlyson','Charlysom'],assignments:[
   ...pairs(['6º ano'],['CIÊNCIAS']),
   ...pairs(['9º ano',...GRADES_EM],['QUÍMICA'])]},
 {person:'Randolfo',aliases:['Randolfo'],assignments:[
   ...pairs(['7º ano','8º ano'],['CIÊNCIAS']),
   ...pairs(['1ª série','3ª série'],['BIOLOGIA'])]},
 {person:'John',aliases:['John','Jons'],assignments:pairs(['2ª série'],['BIOLOGIA'])},
 {person:'Isaías',aliases:['Isaias','Isaías'],assignments:pairs(GRADES_EM,['MATEMÁTICA'])},
 {person:'Gleiciane',aliases:['Gleiciane'],assignments:pairs(GRADES_FII,['MATEMÁTICA'])},
 {person:'Breno',aliases:['Breno'],assignments:pairs(all,['EDUAÇÃO FÍSICA'])}
];
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const tokens=name=>normalize(name).split(' ').filter(Boolean);
const personMatches=(teacher,rule)=>rule.aliases.some(a=>tokens(teacher?.name).includes(normalize(a)));
export function planForRoster(people=[]){
 const valid=(Array.isArray(people)?people:[]).filter(p=>p?.id&&p?.email&&['Professor','Coordenação'].includes(p.profile)&&p.status!=='Desativado');
 return TEACHER_PLAN.map(rule=>{
   const candidates=valid.filter(person=>personMatches(person,rule));
   return {person:rule.person,rule,teacher:candidates.length===1?candidates[0]:null,
    matches:candidates.length,reason:candidates.length===0?'Professor não identificado no cadastro':
     candidates.length>1?'Mais de uma conta com esse nome; escolher e-mail na Gestão':null};
 });
}
export const teacherPlanRules={normalize,personMatches};

import { supabaseAdmin } from '../lib/supabaseClient';

async function checkTable() {
  console.log('Verificando tabla rpm_profiles...');
  const { data, error } = await supabaseAdmin
    .from('rpm_profiles')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Error al acceder a rpm_profiles:', error.message);
    if (error.message.includes('not find the table')) {
      console.log('CONCLUSIÓN: La tabla NO existe en la base de datos.');
    }
  } else {
    console.log('SUCCESS: La tabla existe y es accesible.');
  }
}

checkTable();

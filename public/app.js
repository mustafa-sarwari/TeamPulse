const status = document.querySelector('#status');
let teams = [], tasks = [], busy = false;
async function request(resource, options = {}) {
  const response = await fetch('/api/' + resource, { ...options, headers: { 'Content-Type': 'application/json' } });
  const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Request failed.'); return body;
}
function render() {
  const select = document.querySelector('#task-team'); const selected = select.value; select.replaceChildren();
  const filter = document.querySelector('#team-filter'); const filtered = filter.value;
  filter.replaceChildren(new Option('All teams', ''));
  for (const team of teams) { select.add(new Option(team.name, team.name)); filter.add(new Option(team.name, team.name)); }
  select.value = teams.some(team => team.name === selected) ? selected : teams[0]?.name || ''; filter.value = filtered;
  const board = document.querySelector('#board'); board.replaceChildren();
  for (const [state, title] of [['todo','To do'],['doing','In progress'],['done','Done']]) {
    const column = document.createElement('section'); column.className = 'column';
    const heading = document.createElement('h3'); heading.textContent = title; column.append(heading);
    const rows = tasks.filter(task => task.status === state && (!filtered || task.team === filtered));
    if (!rows.length) { const empty = document.createElement('p'); empty.textContent = 'No tasks'; column.append(empty); }
    for (const task of rows) {
      const card = document.createElement('article'); const name = document.createElement('h3'); name.textContent = task.title;
      const team = document.createElement('p'); team.textContent = task.team;
      const picker = document.createElement('select'); picker.setAttribute('aria-label', 'Status for ' + task.title);
      for (const value of ['todo','doing','done']) picker.add(new Option(value, value)); picker.value = state;
      picker.addEventListener('change', () => mutate(async () => { const updated = await request('tasks/' + task.id, { method:'PATCH', body:JSON.stringify({status:picker.value}) }); tasks = tasks.map(row => row.id === task.id ? updated : row); }));
      const remove = document.createElement('button'); remove.textContent = 'Delete task'; remove.type = 'button'; remove.addEventListener('click', () => mutate(async () => { await request('tasks/' + task.id,{method:'DELETE'}); tasks = tasks.filter(row => row.id !== task.id); }));
      card.append(name,team,picker,remove); column.append(card);
    }
    board.append(column);
  }
}
async function mutate(action) {
  if (busy) return; busy = true; document.querySelectorAll('button').forEach(button => button.disabled = true);
  try { await action(); status.textContent = 'Saved.'; } catch (error) { status.textContent = error.message; }
  finally { busy = false; render(); document.querySelectorAll('button').forEach(button => button.disabled = false); }
}
document.querySelector('#team-form').addEventListener('submit', event => { event.preventDefault(); mutate(async () => { const input = document.querySelector('#team-name'); const row = await request('teams',{method:'POST',body:JSON.stringify({name:input.value})}); teams.unshift(row); input.value = ''; }); });
document.querySelector('#task-form').addEventListener('submit', event => { event.preventDefault(); mutate(async () => { const input = document.querySelector('#task-title'); const row = await request('tasks',{method:'POST',body:JSON.stringify({title:input.value,team:document.querySelector('#task-team').value,status:'todo'})}); tasks.unshift(row); input.value = ''; }); });
document.querySelector('#team-filter').addEventListener('change',render);
(async () => { try { teams = await request('teams'); tasks = await request('tasks'); status.textContent = 'Connected.'; } catch(error) { status.textContent = error.message; } render(); })();

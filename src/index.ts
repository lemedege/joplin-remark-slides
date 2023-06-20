import joplin from 'api';

import { ContentScriptType, ToolbarButtonLocation, MenuItem, MenuItemLocation, } from 'api/types'
import webviewApi from 'api/JoplinViews'
import JoplinViewsPanels from 'api/JoplinViewsPanels';
const fs = (joplin as any).require('fs-extra');
//const { Plugin } = require('api/JoplinPlugins');
const path = require('path');

//---------collecting and transfering the static file
async function resourceFetcher(note, resourceDir: string,  ssg ) {
	const { items } = await joplin.data.get(['notes', note.id, 'resources'] , { fields: ['id', 'title', 'file_extension']} );
	for( var i = 0; i < items.length; i++ ) {
		const resource = items[i];
		const ext = resource.file_extension;
		const srcPath = path.join(resourceDir, `${resource.id}.${ext}`);
		//const dest_Path = path.join(destPath, resource.title)
		//await fs.copy(srcPath, dest_Path);
		if (ssg === 'hugo') {
			note.body = note.body.replace( `:/${resource.id}`,  `/resources/${resource.title}` );
		} else if (ssg === 'gatsby') {
			note.body = note.body.replace( `:/${resource.id}`,  path.join('..', '..', 'static' , `${resource.title}`));
		} else if (ssg === 'jekyll') {
			note.body = note.body.replace( `:/${resource.id}`, path.join('..', 'resources', `${resource.title}`));
		}
	};
};




joplin.plugins.register({
  //async onStart() 
  onStart: async function () {
    
    const resourceDir = await joplin.settings.globalValue('resourceDir');


    let dialogs = joplin.views.dialogs;
    let slidesdialog = await dialogs.create(`slides`);
    //dialogs.addScript(slidesdialog,"./remark/remark.js");
    dialogs.addScript(slidesdialog,"./remark/remark.css");

    await dialogs.setButtons(slidesdialog, [
      { id: 'cancel', title: 'Close' }
    ]);
    await dialogs.setFitToContent(slidesdialog, false);


    await joplin.commands.register({
      name: 'update_slides_text',
  execute: async (...args) => {
    
    const note = await joplin.workspace.selectedNote();
    const noteContent = await joplin.data.get(['notes', note.id], {
      fields: ['body'],
      format: 'text',
    });
  
    const imagePaths = await joplin.data.get(['notes', note.id, 'resources'], {
      fields: ['id', 'title', 'file_extension'],
    });

    const ssg = 'hugo';

    await resourceFetcher(note, resourceDir, ssg);
						//note.body = frontMatter + '\n' + note.body;

  
    const html = `
   
        <textarea id="source">
    
        ${note.body}
    
        </textarea>
        <script src="https://remarkjs.com/downloads/remark-latest.min.js"></script>
        <script>
        console.log("running from html");
        //await new Promise(r => setTimeout(r, 5000));
        var slideshow = remark.create();

        </script>
      `

    const html2 = `
    <p> test </p>
    `
  
    await dialogs.setHtml(slidesdialog,html);
  }
  })

  await joplin.commands.register({
    name: 'show_slides',
    label: 'Slideshow',
    iconName: 'fa fa-play',
    execute: async (folderId: string) => {
      await joplin.commands.execute('update_slides_text');
const { id, formData } = await dialogs.open(slidesdialog);


await dialogs.addScript(slidesdialog,"./remark/remark.js");

await dialogs.addScript(slidesdialog,"./remark/run_remark.js");


/*if (id == "submit") {
  //---------form validation
  if (!formData.basic_info.ssg) {
    alert('Please choose one static site generator.');
    return;
  }
  if (!path.isAbsolute(formData.basic_info.dest_Path)) {
    alert('Provided path is not valid.')
    return;
  }
            await joplin.commands.execute('exportingProcedure', folderId , formData);
        }*/
    }
}
);

await joplin.views.menuItems.create('Slideshow', 'show_slides', MenuItemLocation.NoteListContextMenu);

  }
  }
  );
  


import joplin from 'api';

import { ToolbarButtonLocation, SettingItemSubType, SettingItemType} from 'api/types'
const fs = (joplin as any).require('fs-extra');
const path = require('path');

//---------collecting and transfering the static file
async function resourceFetcher(note, resourceDir: string, destPath: string ) {
  
  const installDir = await joplin.plugins.installationDir();
  await fs.copy(path.join(installDir,'/remark/remark.js'), path.join(destPath,'resources','remark.js'));
  
  const should_copy_pictures = await joplin.settings.value('copy_pictures');
	const { items } = await joplin.data.get(['notes', note.id, 'resources'] , { fields: ['id', 'title', 'file_extension']} );
	for( var i = 0; i < items.length; i++ ) {
		const resource = items[i];
		const ext = resource.file_extension;
		const srcPath = path.join(resourceDir, `${resource.id}.${ext}`);
		const dest_Path = path.join(destPath,'resources', resource.title)
    if(should_copy_pictures){
      await fs.copy(srcPath, dest_Path);
      note.body = note.body.replace( `:/${resource.id}`,  path.join('resources', `${resource.title}`));
    }
    else {
      note.body = note.body.replace( `:/${resource.id}`,  srcPath);
    }
	};
};


function renderSlides(note): string {
  let html = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>${note.title}</title>
      <meta charset="utf-8">
      <style>
        @import url(https://fonts.googleapis.com/css?family=Yanone+Kaffeesatz);
        @import url(https://fonts.googleapis.com/css?family=Droid+Serif:400,700,400italic);
        @import url(https://fonts.googleapis.com/css?family=Ubuntu+Mono:400,700,400italic);
  
        body { font-family: 'Droid Serif'; }
        h1, h2, h3 {
          font-family: 'Yanone Kaffeesatz';
          font-weight: normal;
        }
        .remark-code, .remark-inline-code { font-family: 'Ubuntu Mono'; }
      </style>
    </head>
    <body>
      <textarea id="source">
      ${note.body}
      </textarea>
      <script src="./resources/remark.js">
      </script>
      <script>
        var slideshow = remark.create();
      </script>
    </body>
  </html>
`
return html
};

joplin.plugins.register({
  onStart: async function () {
    
    const resourceDir = await joplin.settings.globalValue('resourceDir');

    await joplin.settings.registerSection('slidesSettingSection', {
			label: 'Export to slides',
			iconName: 'fas fa-tv',
		});

    await joplin.settings.registerSettings({
			'export_path_setting': {
				value: '',
				type: SettingItemType.String,
				subType: SettingItemSubType.DirectoryPath,
				section: 'slidesSettingSection',
				public: true,
				label: 'Slides export directory',
      },
      'copy_pictures': {
				value: '',
				type: SettingItemType.Bool,
				section: 'slidesSettingSection',
				public: true,
				label: 'Copy pictures to export folder',
      },
      'open_after_export': {
				value: '',
				type: SettingItemType.Bool,
				section: 'slidesSettingSection',
				public: true,
				label: 'Open slides after export',
      },
    
    }
    );


    await joplin.commands.register({
      name: 'update_slides_text',
  execute: async (...args) => {

    const dest_Path = await joplin.settings.value('export_path_setting');
    
    const note = await joplin.workspace.selectedNote();
    const noteContent = await joplin.data.get(['notes', note.id], {
      fields: ['body'],
      format: 'text',
    });
  
    const imagePaths = await joplin.data.get(['notes', note.id, 'resources'], {
      fields: ['id', 'title', 'file_extension'],
    });
    
    const folderName = note.title;
    const folderPath = path.join(dest_Path, 'slides', folderName);

    await resourceFetcher(note, resourceDir, folderPath);

    let html = renderSlides(note);

		await fs.mkdirp(path.join(dest_Path, 'slides', folderName));//markdown

    fs.writeFile(path.join(dest_Path, 'slides', folderName, `${note.title}.html`), html);
    const should_open_browser = await joplin.settings.value('open_after_export');  
    if(should_open_browser){
  
      console.debug(path.join('file://',dest_Path, 'slides', folderName, `${note.title}.html`));
      await joplin.commands.execute('openItem', path.join('file://',dest_Path, 'slides', folderName, `${note.title}.html`));
    }
					
  }
  })

  await joplin.commands.register({
    name: 'export_note',
    label: 'Export to slideshow',
    iconName: 'fa fa-tv',
    execute: async (folderId: string) => {


    const dest_Path = await joplin.settings.value('export_path_setting');
        if (!path.isAbsolute(dest_Path)) {
          alert('Provided path is not valid.')
          return;
        }
        await joplin.commands.execute('update_slides_text', folderId );

      }


    });


await joplin.views.toolbarButtons.create('export_note', 'export_note', ToolbarButtonLocation.EditorToolbar);


  }
  }
  );
  


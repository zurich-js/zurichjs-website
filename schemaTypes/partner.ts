import { defineType } from 'sanity';

export default defineType({
  name: 'partner',
  title: 'Partner',
  type: 'document',
  fields: [
    { name: 'id', title: 'ID', type: 'slug' },
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'logo', title: 'Logo', type: 'image' },
    { name: 'url', title: 'Website URL', type: 'url' },
  ],
});
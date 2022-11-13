const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder, Attachment } = require('discord.js');
const fs = require('fs');

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        const button = interaction.customId;

        if (button === 'open-ticket') {
            await interaction.deferReply({ ephemeral: true });

            const ticketData = JSON.parse(fs.readFileSync('ticket.json', 'utf-8')); // Read the data from the file.

            const supportRole = interaction.guild.roles.cache.get(ticketData.supportRoleID); // Get the support role from the data.
            const openCategory = interaction.guild.channels.cache.get(ticketData.openCategoryID); // Get the open category from the data.
            const closeCategory = interaction.guild.channels.cache.get(ticketData.closeCategoryID); // Get the close category from the data.

            if (!supportRole) return interaction.editReply({ embeds: [client.config.embeds.E('The support role does not exist!')] });
            if (!openCategory) return interaction.editReply({ embeds: [client.config.embeds.E('The open category does not exist!')] });
            if (!closeCategory) return interaction.editReply({ embeds: [client.config.embeds.E('The close category does not exist!')] });


            const createdChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: openCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: PermissionFlagsBits.ViewChannel // Deny the view channel permission to the everyone role.
                    },
                    {
                        id: interaction.user.id,
                        allow: PermissionFlagsBits.ViewChannel // Allow the view channel permission to the user who clicked on the button.
                    },
                    {
                        id: supportRole.id,
                        allow: PermissionFlagsBits.ViewChannel // Allow the view channel permission to the support role.
                    }
                ],
                topic: `🎫 Ticket created by ${interaction.user.tag}! - ${interaction.user.id}` // Set the topic of the channel.
            });

            const createdEmbed = new EmbedBuilder()
                .setTitle('🎫 Ticket System')
                .setDescription(`Hello ${interaction.user}👋, welcome to your ticket!\nPlease explain your problem as detailed as possible.\nA <@&${supportRole.id}> will be with you shortly!`)
                .setColor(client.config.colors.info)
                .setTimestamp();

            const createdRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close-ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                );

            await createdChannel.send({ embeds: [createdEmbed], components: [createdRow] });
            await interaction.editReply({ embeds: [client.config.embeds.S(`Your ticket has been created! ${createdChannel}`)] }); 
        } else if (button === 'close-ticket') {
            const ticketEmbed = new EmbedBuilder()
                .setTitle('🎫 Ticket System')
                .setDescription(`Your are about to close your ticket!\nAre you sure you want to close your ticket?`)
                .setColor(client.config.colors.error)
                .setTimestamp();

            const ticketRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm-close-ticket')
                        .setLabel('Confirm Close Ticket')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel-close-ticket')
                        .setLabel('Cancel Close Ticket')
                        .setStyle(ButtonStyle.Success)
                );

            await interaction.reply({ embeds: [ticketEmbed], components: [ticketRow], ephemeral: true });
        } else if (button === 'confirm-close-ticket') {
            const ticketData = JSON.parse(fs.readFileSync('ticket.json', 'utf-8')); // Read the data from the file.

            const closeCategory = interaction.guild.channels.cache.get(ticketData.closeCategoryID); // Get the close category from the data.

            if (!closeCategory) return interaction.editReply({ embeds: [client.config.embeds.E('The close category does not exist!')] });

            const closedRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('delete-ticket')
                        .setLabel('Delete Ticket')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('reopen-ticket')
                        .setLabel('Reopen Ticket')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('transcript-ticket')
                        .setLabel('Transcript Ticket')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.update({ embeds: [client.config.embeds.S('Your ticket has been closed!')], components: [] });

            await interaction.channel.send({ embeds: [client.config.embeds.S(`\🎫 : ${interaction.user} has closed this ticket!`)], components: [closedRow] }); 
            
            // Change the parent of the channel.
            await interaction.channel.setParent(closeCategory);
        } else if (button === 'cancel-close-ticket') {
            await interaction.update({ embeds: [client.config.embeds.S('Your ticket has not been closed!')], components: [] });
        } else if (button === 'delete-ticket') {
            await interaction.reply({ embeds: [client.config.embeds.S(`Deleted the ticket! \`${interaction.channel.name}\` This channel will be deleted in 5 seconds!`)], ephemeral: true });
            setTimeout(() => interaction.channel.delete(), 5000);
        } else if (button === 'reopen-ticket') {
            const ticketData = JSON.parse(fs.readFileSync('ticket.json', 'utf-8')); // Read the data from the file.

            const openCategory = interaction.guild.channels.cache.get(ticketData.openCategoryID); // Get the open category from the data.

            if (!openCategory) return interaction.reply({ embeds: [client.config.embeds.E('The open category does not exist!')] });
            
            // Change the parent of the channel.
            await interaction.channel.setParent(openCategory);

            await interaction.update({ embeds: [client.config.embeds.S(`${interaction.user} has reopened this ticket!`)], components: [] });
        } else if (button === 'transcript-ticket') {
            await interaction.deferReply({ ephemeral: true });

            const transcript = await interaction.channel.messages.fetch({ limit: 100 }); // Fetch the last 100 messages from the channel.

            const transcriptText = transcript.map(m => `[${m.createdAt.toDateString()}] [${m.createdAt.toTimeString().split(' ')[0]}] [${m.author.tag}]: ${m.content}`).join('\n'); // Map the messages and join them with a new line.
            const transcriptData = `🎫 Transcript for #${interaction.channel.name}\n\n${transcriptText}`; // Create the transcript data.

            const transcriptFile = new AttachmentBuilder()
                .setName(`transcript-${interaction.channel.name}.txt`) // Set the name of the file.
                .setFile(Buffer.from(transcriptData)); // Set the file data.

            await interaction.editReply({ files: [transcriptFile] });
        }
    }
}
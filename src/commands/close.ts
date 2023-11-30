import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	EmbedBuilder,
	GuildTextBasedChannel,
	userMention
} from 'discord.js';
import { Discord, Slash, SlashOption } from 'discordx';
import { client, prisma } from '..';
import Colors from '../constants/Colors';
import dayjs from 'dayjs';
import axios from 'axios';
import { env } from '../env/server';

@Discord()
class Close {
	async createTranscript(channel: GuildTextBasedChannel) {
		let msgs = await channel.messages.fetch();
		msgs = msgs.reverse();

		let formatted = msgs.map((msg) => {
			const time = dayjs().format('MM/DD/YYYY HH:mm:ss');
			return `[${time}] ` + msg.author.username + ': ' + msg.cleanContent;
		});

		const hasteResponse: {
			data: {
				key: string;
			};
		} = await axios.post(`https://paste.tarna.dev/documents`, formatted.join('\n'));

		return `https://paste.tarna.dev/${hasteResponse.data.key}`;
	}

	@Slash({ description: 'Close a ticket' })
	async close(
		@SlashOption({
			description: 'Reason for closing this ticket',
			name: 'reason',
			required: false,
			type: ApplicationCommandOptionType.String
		})
		reason: string,
		interaction: CommandInteraction
	) {
		await interaction.deferReply();
		const ticket = await prisma.tickets.findUnique({
			where: {
				id: interaction.channelId
			}
		});

		if (ticket == null) {
			await interaction.reply({
				content: 'You can only run this command inside of ticket',
				ephemeral: true
			});
			return;
		}

		const creator = await client.users.fetch(ticket.createdBy);
		const closedEmbed = new EmbedBuilder()
			.setColor(Colors.purple)
			.setTitle('Ticket closed')
			.setFields({
				name: 'Reason',
				value: reason ?? 'No reason specified'
			});

		const transcript = await this.createTranscript(interaction.channel);
		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setURL(transcript)
			.setLabel('View Transcript');
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

		try {
			await creator.send({
				embeds: [closedEmbed],
				components: [row]
			});
		} catch (err) {
			console.log(`Failed to send ticket log to ${creator.id}.`);
		}

		const logChannel = (await interaction.guild.channels.fetch(
			env.LOGS_CHANNEL
		)) as GuildTextBasedChannel;
		closedEmbed.setDescription(`Closed by ${userMention(interaction.user.id)}`).setFooter({
			text: `Ticket ID: ${interaction.channel.id}`
		});
		await logChannel.send({
			embeds: [closedEmbed],
			components: [row]
		});

		await interaction.editReply({
			content: 'Closed ticket!'
		});

		interaction.channel.delete('Ticket closed');
	}
}

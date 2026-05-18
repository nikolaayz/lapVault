CREATE INDEX "cars_owner_id_idx" ON "cars" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "event_registrations_user_id_idx" ON "event_registrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_registrations_event_id_idx" ON "event_registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_date_idx" ON "events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "events_track_id_idx" ON "events" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "laps_user_id_idx" ON "laps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "laps_track_id_lap_time_idx" ON "laps" USING btree ("track_id","lap_time_ms");